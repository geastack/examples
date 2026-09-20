// SPDX-License-Identifier: MIT
// Raw DEFLATE decoder adapted from tiny-inflate 1.0.3.
// Copyright (c) 2015-present Devon Govett.
#include "epub_archive.h"

#include "image.h"
#include "pixel.h"

#include <algorithm>
#include <array>
#include <cctype>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <sys/stat.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace gea::host::epub_archive {
namespace {

struct Tree {
  std::array<std::uint16_t, 16> table{};
  std::array<std::uint16_t, 288> trans{};
};

struct Data {
  const std::vector<std::uint8_t> &source;
  std::vector<std::uint8_t> &dest;
  std::size_t sourceIndex = 0;
  std::size_t destLen = 0;
  std::uint32_t tag = 0;
  int bitcount = 0;
  bool ok = true;
  Tree lengthTree{};
  Tree distanceTree{};
};

Tree fixedLengthTree;
Tree fixedDistanceTree;
std::array<std::uint8_t, 30> lengthBits{};
std::array<std::uint16_t, 30> lengthBase{};
std::array<std::uint8_t, 30> distanceBits{};
std::array<std::uint16_t, 30> distanceBase{};
constexpr std::array<std::uint8_t, 19> codeLengthOrder{
    16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15};
Tree codeTree;
std::array<std::uint8_t, 320> codeLengths{};
std::array<std::uint16_t, 16> treeOffsets{};
bool initialized = false;

std::uint8_t sourceByte(Data &data) {
  // Huffman decoding keeps a 24-bit lookahead and may legally peek up to two
  // zero bytes past the final compressed byte. Output-size and block-end checks
  // below still reject truncated streams.
  if (data.sourceIndex >= data.source.size()) return 0;
  return data.source[data.sourceIndex++];
}

void buildBitsBase(std::array<std::uint8_t, 30> &bits,
                   std::array<std::uint16_t, 30> &base,
                   int delta,
                   int first) {
  for (int i = 0; i < delta; ++i) bits[static_cast<std::size_t>(i)] = 0;
  for (int i = 0; i < 30 - delta; ++i)
    bits[static_cast<std::size_t>(i + delta)] = static_cast<std::uint8_t>(i / delta);
  int sum = first;
  for (int i = 0; i < 30; ++i) {
    base[static_cast<std::size_t>(i)] = static_cast<std::uint16_t>(sum);
    sum += 1 << bits[static_cast<std::size_t>(i)];
  }
}

void buildFixedTrees() {
  fixedLengthTree.table.fill(0);
  fixedLengthTree.table[7] = 24;
  fixedLengthTree.table[8] = 152;
  fixedLengthTree.table[9] = 112;
  for (int i = 0; i < 24; ++i) fixedLengthTree.trans[static_cast<std::size_t>(i)] = 256 + i;
  for (int i = 0; i < 144; ++i) fixedLengthTree.trans[static_cast<std::size_t>(24 + i)] = i;
  for (int i = 0; i < 8; ++i) fixedLengthTree.trans[static_cast<std::size_t>(168 + i)] = 280 + i;
  for (int i = 0; i < 112; ++i) fixedLengthTree.trans[static_cast<std::size_t>(176 + i)] = 144 + i;
  fixedDistanceTree.table.fill(0);
  fixedDistanceTree.table[5] = 32;
  for (int i = 0; i < 32; ++i) fixedDistanceTree.trans[static_cast<std::size_t>(i)] = i;
}

void initialize() {
  if (initialized) return;
  initialized = true;
  buildFixedTrees();
  buildBitsBase(lengthBits, lengthBase, 4, 3);
  buildBitsBase(distanceBits, distanceBase, 2, 1);
  lengthBits[28] = 0;
  lengthBase[28] = 258;
}

void buildTree(Tree &tree, const std::array<std::uint8_t, 320> &lengths,
               int offset, int count) {
  tree.table.fill(0);
  for (int i = 0; i < count; ++i) {
    const auto length = lengths[static_cast<std::size_t>(offset + i)];
    if (length < tree.table.size()) tree.table[length]++;
  }
  tree.table[0] = 0;
  int sum = 0;
  for (std::size_t i = 0; i < tree.table.size(); ++i) {
    treeOffsets[i] = static_cast<std::uint16_t>(sum);
    sum += tree.table[i];
  }
  for (int i = 0; i < count; ++i) {
    const auto length = lengths[static_cast<std::size_t>(offset + i)];
    if (!length || length >= treeOffsets.size()) continue;
    const auto slot = treeOffsets[length]++;
    if (slot < tree.trans.size()) tree.trans[slot] = static_cast<std::uint16_t>(i);
  }
}

int getBit(Data &data) {
  if (data.bitcount == 0) {
    data.tag = sourceByte(data);
    data.bitcount = 8;
  }
  const int bit = static_cast<int>(data.tag & 1U);
  data.tag >>= 1U;
  --data.bitcount;
  return bit;
}

int readBits(Data &data, int count, int base) {
  if (count == 0) return base;
  while (data.bitcount < 24) {
    data.tag |= static_cast<std::uint32_t>(sourceByte(data)) << data.bitcount;
    data.bitcount += 8;
  }
  const auto mask = static_cast<std::uint32_t>(0xffffU >> (16 - count));
  const int value = static_cast<int>(data.tag & mask);
  data.tag >>= count;
  data.bitcount -= count;
  return value + base;
}

int decodeSymbol(Data &data, const Tree &tree) {
  while (data.bitcount < 24) {
    data.tag |= static_cast<std::uint32_t>(sourceByte(data)) << data.bitcount;
    data.bitcount += 8;
  }
  int sum = 0;
  int current = 0;
  int length = 0;
  std::uint32_t tag = data.tag;
  do {
    current = 2 * current + static_cast<int>(tag & 1U);
    tag >>= 1U;
    ++length;
    if (length >= static_cast<int>(tree.table.size())) {
      data.ok = false;
      return 0;
    }
    sum += tree.table[static_cast<std::size_t>(length)];
    current -= tree.table[static_cast<std::size_t>(length)];
  } while (current >= 0);
  data.tag = tag;
  data.bitcount -= length;
  const int slot = sum + current;
  if (slot < 0 || slot >= static_cast<int>(tree.trans.size())) {
    data.ok = false;
    return 0;
  }
  return tree.trans[static_cast<std::size_t>(slot)];
}

void decodeTrees(Data &data, Tree &lengthTree, Tree &distanceTree) {
  const int literalCount = readBits(data, 5, 257);
  const int distanceCount = readBits(data, 5, 1);
  const int codeCount = readBits(data, 4, 4);
  codeLengths.fill(0);
  for (int i = 0; i < codeCount; ++i)
    codeLengths[codeLengthOrder[static_cast<std::size_t>(i)]] =
        static_cast<std::uint8_t>(readBits(data, 3, 0));
  buildTree(codeTree, codeLengths, 0, 19);

  int number = 0;
  const int total = literalCount + distanceCount;
  while (number < total && data.ok) {
    const int symbol = decodeSymbol(data, codeTree);
    if (symbol == 16) {
      if (number == 0) { data.ok = false; return; }
      const auto previous = codeLengths[static_cast<std::size_t>(number - 1)];
      int repeat = readBits(data, 2, 3);
      while (repeat-- > 0 && number < total) codeLengths[static_cast<std::size_t>(number++)] = previous;
    } else if (symbol == 17 || symbol == 18) {
      int repeat = symbol == 17 ? readBits(data, 3, 3) : readBits(data, 7, 11);
      while (repeat-- > 0 && number < total) codeLengths[static_cast<std::size_t>(number++)] = 0;
    } else if (symbol >= 0 && symbol <= 15) {
      codeLengths[static_cast<std::size_t>(number++)] = static_cast<std::uint8_t>(symbol);
    } else {
      data.ok = false;
    }
  }
  if (!data.ok) return;
  buildTree(lengthTree, codeLengths, 0, literalCount);
  buildTree(distanceTree, codeLengths, literalCount, distanceCount);
}

void inflateBlock(Data &data, const Tree &lengthTree, const Tree &distanceTree) {
  while (data.ok) {
    int symbol = decodeSymbol(data, lengthTree);
    if (symbol == 256) return;
    if (symbol < 256) {
      if (data.destLen >= data.dest.size()) { data.ok = false; return; }
      data.dest[data.destLen++] = static_cast<std::uint8_t>(symbol);
      continue;
    }
    symbol -= 257;
    if (symbol < 0 || symbol >= 29) { data.ok = false; return; }
    const int length = readBits(data, lengthBits[static_cast<std::size_t>(symbol)],
                                lengthBase[static_cast<std::size_t>(symbol)]);
    const int distanceSymbol = decodeSymbol(data, distanceTree);
    if (distanceSymbol < 0 || distanceSymbol >= 30) { data.ok = false; return; }
    const int distance = readBits(data, distanceBits[static_cast<std::size_t>(distanceSymbol)],
                                  distanceBase[static_cast<std::size_t>(distanceSymbol)]);
    if (distance <= 0 || static_cast<std::size_t>(distance) > data.destLen ||
        data.destLen + static_cast<std::size_t>(length) > data.dest.size()) {
      data.ok = false;
      return;
    }
    std::size_t from = data.destLen - static_cast<std::size_t>(distance);
    for (int i = 0; i < length; ++i) data.dest[data.destLen++] = data.dest[from++];
  }
}

void inflateUncompressed(Data &data) {
  while (data.bitcount > 8) {
    if (data.sourceIndex == 0) { data.ok = false; return; }
    --data.sourceIndex;
    data.bitcount -= 8;
  }
  if (data.sourceIndex + 4 > data.source.size()) { data.ok = false; return; }
  const int length = data.source[data.sourceIndex] + 256 * data.source[data.sourceIndex + 1];
  const int inverse = data.source[data.sourceIndex + 2] + 256 * data.source[data.sourceIndex + 3];
  if (length != ((~inverse) & 0xffff)) { data.ok = false; return; }
  data.sourceIndex += 4;
  if (data.sourceIndex + static_cast<std::size_t>(length) > data.source.size() ||
      data.destLen + static_cast<std::size_t>(length) > data.dest.size()) {
    data.ok = false;
    return;
  }
  std::copy_n(data.source.begin() + static_cast<std::ptrdiff_t>(data.sourceIndex),
              length,
              data.dest.begin() + static_cast<std::ptrdiff_t>(data.destLen));
  data.sourceIndex += static_cast<std::size_t>(length);
  data.destLen += static_cast<std::size_t>(length);
  data.bitcount = 0;
}

}  // namespace

std::vector<std::uint8_t> inflateRaw(const std::vector<std::uint8_t> &source,
                                     double outputLength) {
  initialize();
  if (source.empty() || outputLength <= 0 || outputLength > 64.0 * 1024.0 * 1024.0)
    return {};
  std::vector<std::uint8_t> output(static_cast<std::size_t>(outputLength));
  Data data{source, output};
  int finalBlock = 0;
  do {
    finalBlock = getBit(data);
    const int blockType = readBits(data, 2, 0);
    if (!data.ok) break;
    if (blockType == 0) inflateUncompressed(data);
    else if (blockType == 1) inflateBlock(data, fixedLengthTree, fixedDistanceTree);
    else if (blockType == 2) {
      decodeTrees(data, data.lengthTree, data.distanceTree);
      if (data.ok) inflateBlock(data, data.lengthTree, data.distanceTree);
    } else {
      data.ok = false;
    }
  } while (data.ok && !finalBlock);
  if (!data.ok || data.destLen != output.size()) return {};
  return output;
}

namespace {

struct ZipEntry {
  std::string name;
  int method = 0;
  int flags = 0;
  std::size_t compressedSize = 0;
  std::size_t outputSize = 0;
  std::size_t localOffset = 0;
};

struct ManifestItem {
  std::string id;
  std::string href;
  std::string mediaType;
};

struct Chapter {
  std::string id;
  std::string title;
  std::vector<std::string> paragraphs;
};

std::uint16_t read16(const std::vector<std::uint8_t> &data, std::size_t offset) {
  if (offset + 2 > data.size()) return 0;
  return static_cast<std::uint16_t>(data[offset] | (data[offset + 1] << 8));
}

std::uint32_t read32(const std::vector<std::uint8_t> &data, std::size_t offset) {
  if (offset + 4 > data.size()) return 0;
  return static_cast<std::uint32_t>(data[offset]) |
         (static_cast<std::uint32_t>(data[offset + 1]) << 8U) |
         (static_cast<std::uint32_t>(data[offset + 2]) << 16U) |
         (static_cast<std::uint32_t>(data[offset + 3]) << 24U);
}

// Random-access reader over the archive on storage. A novel's EPUB is often
// larger than the free heap, so the file is never loaded whole — the central
// directory and each entry's compressed bytes are read on demand.
class ZipFile {
public:
  ZipFile() = default;
  ZipFile(const ZipFile &) = delete;
  ZipFile &operator=(const ZipFile &) = delete;
  ~ZipFile() {
    close();
  }
  void close() {
    if (file_) std::fclose(file_);
    file_ = nullptr;
    size_ = 0;
  }
  bool open(const std::string &path) {
    close();
    file_ = std::fopen(path.c_str(), "rb");
    if (!file_) return false;
    if (std::fseek(file_, 0, SEEK_END) != 0) return false;
    const long size = std::ftell(file_);
    if (size <= 0) return false;
    size_ = static_cast<std::size_t>(size);
    return true;
  }
  std::size_t size() const { return size_; }
  bool readAt(std::size_t offset, std::size_t length, std::vector<std::uint8_t> &out) {
    if (!file_ || length > size_ || offset > size_ - length) return false;
    out.resize(length);
    if (std::fseek(file_, static_cast<long>(offset), SEEK_SET) != 0) return false;
    return std::fread(out.data(), 1, length, file_) == length;
  }

private:
  std::FILE *file_ = nullptr;
  std::size_t size_ = 0;
};

std::string lowerAscii(const std::string &value) {
  std::string out = value;
  for (char &ch : out) ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
  return out;
}

bool endsWith(const std::string &value, const std::string &suffix) {
  return value.size() >= suffix.size() &&
         value.compare(value.size() - suffix.size(), suffix.size(), suffix) == 0;
}

bool keepTextEntry(const std::string &path) {
  const std::string lower = lowerAscii(path);
  return endsWith(lower, ".xml") || endsWith(lower, ".opf") ||
         endsWith(lower, ".xhtml") || endsWith(lower, ".html") ||
         endsWith(lower, ".htm") || endsWith(lower, ".css");
}

bool zipEntries(ZipFile &zip, std::vector<ZipEntry> &entries) {
  if (zip.size() < 22) return false;
  // End-of-central-directory record: within the last 65558 bytes of the file.
  const std::size_t tailSize = zip.size() > 65558 ? 65558 : zip.size();
  std::vector<std::uint8_t> tail;
  if (!zip.readAt(zip.size() - tailSize, tailSize, tail)) return false;
  std::size_t end = tail.size() - 22;
  bool found = false;
  while (true) {
    if (read32(tail, end) == 0x06054b50U) { found = true; break; }
    if (end == 0) break;
    --end;
  }
  if (!found) return false;
  const int count = read16(tail, end + 10);
  const std::size_t directorySize = read32(tail, end + 12);
  const std::size_t directoryOffset = read32(tail, end + 16);
  std::vector<std::uint8_t> directory;
  if (!zip.readAt(directoryOffset, directorySize, directory)) return false;
  std::size_t offset = 0;
  entries.clear();
  entries.reserve(static_cast<std::size_t>(count));
  for (int i = 0; i < count; ++i) {
    if (offset + 46 > directory.size() || read32(directory, offset) != 0x02014b50U) return false;
    const std::size_t nameLength = read16(directory, offset + 28);
    const std::size_t extraLength = read16(directory, offset + 30);
    const std::size_t commentLength = read16(directory, offset + 32);
    if (offset + 46 + nameLength > directory.size()) return false;
    ZipEntry entry;
    entry.flags = read16(directory, offset + 8);
    entry.method = read16(directory, offset + 10);
    entry.compressedSize = read32(directory, offset + 20);
    entry.outputSize = read32(directory, offset + 24);
    entry.localOffset = read32(directory, offset + 42);
    entry.name.assign(reinterpret_cast<const char *>(directory.data() + offset + 46), nameLength);
    entries.push_back(std::move(entry));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return true;
}

bool extractEntry(ZipFile &zip,
                  const ZipEntry &entry,
                  std::string &text) {
  if ((entry.flags & 1) != 0) return false;
  std::vector<std::uint8_t> header;
  if (!zip.readAt(entry.localOffset, 30, header) || read32(header, 0) != 0x04034b50U) return false;
  const std::size_t nameLength = read16(header, 26);
  const std::size_t extraLength = read16(header, 28);
  const std::size_t contentOffset = entry.localOffset + 30 + nameLength + extraLength;
  std::vector<std::uint8_t> bytes;
  if (entry.method == 0) {
    if (!zip.readAt(contentOffset, entry.compressedSize, bytes)) return false;
  } else if (entry.method == 8) {
    std::vector<std::uint8_t> compressed;
    if (!zip.readAt(contentOffset, entry.compressedSize, compressed)) return false;
    bytes = inflateRaw(compressed, static_cast<double>(entry.outputSize));
  } else {
    return false;
  }
  if (bytes.size() != entry.outputSize) return false;
  text.assign(reinterpret_cast<const char *>(bytes.data()), bytes.size());
  return true;
}

std::string normalizePath(const std::string &path) {
  std::vector<std::string> parts;
  std::string current;
  for (std::size_t i = 0; i <= path.size(); ++i) {
    const char ch = i < path.size() ? path[i] : '/';
    if (ch == '/' || ch == '\\') {
      if (current == "..") { if (!parts.empty()) parts.pop_back(); }
      else if (!current.empty() && current != ".") parts.push_back(current);
      current.clear();
    } else current.push_back(ch);
  }
  std::string out;
  for (std::size_t i = 0; i < parts.size(); ++i) {
    if (i) out.push_back('/');
    out += parts[i];
  }
  return out;
}

int hexValue(char ch) {
  if (ch >= '0' && ch <= '9') return ch - '0';
  if (ch >= 'a' && ch <= 'f') return ch - 'a' + 10;
  if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
  return -1;
}

std::string percentDecode(const std::string &value) {
  std::string out;
  for (std::size_t i = 0; i < value.size(); ++i) {
    if (value[i] == '%' && i + 2 < value.size()) {
      const int high = hexValue(value[i + 1]);
      const int low = hexValue(value[i + 2]);
      if (high >= 0 && low >= 0) { out.push_back(static_cast<char>((high << 4) | low)); i += 2; continue; }
    }
    out.push_back(value[i]);
  }
  return out;
}

std::string resolvePath(const std::string &base, const std::string &href) {
  const std::size_t hash = href.find('#');
  const std::string clean = percentDecode(href.substr(0, hash));
  const std::size_t slash = base.rfind('/');
  return normalizePath((slash == std::string::npos ? std::string() : base.substr(0, slash + 1)) + clean);
}

void appendUtf8(std::string &out, unsigned int code) {
  if (code <= 0x7f) out.push_back(static_cast<char>(code));
  else if (code <= 0x7ff) {
    out.push_back(static_cast<char>(0xc0 | (code >> 6)));
    out.push_back(static_cast<char>(0x80 | (code & 0x3f)));
  } else if (code <= 0xffff) {
    out.push_back(static_cast<char>(0xe0 | (code >> 12)));
    out.push_back(static_cast<char>(0x80 | ((code >> 6) & 0x3f)));
    out.push_back(static_cast<char>(0x80 | (code & 0x3f)));
  } else if (code <= 0x10ffff) {
    out.push_back(static_cast<char>(0xf0 | (code >> 18)));
    out.push_back(static_cast<char>(0x80 | ((code >> 12) & 0x3f)));
    out.push_back(static_cast<char>(0x80 | ((code >> 6) & 0x3f)));
    out.push_back(static_cast<char>(0x80 | (code & 0x3f)));
  }
}

std::string decodeEntities(const std::string &value) {
  static const std::unordered_map<std::string, std::string> named{
      {"amp", "&"}, {"quot", "\""}, {"apos", "'"}, {"lt", "<"}, {"gt", ">"},
      {"nbsp", " "}, {"mdash", "—"}, {"ndash", "–"}, {"hellip", "…"},
      {"ldquo", "“"}, {"rdquo", "”"}, {"lsquo", "‘"}, {"rsquo", "’"}};
  std::string out;
  for (std::size_t i = 0; i < value.size();) {
    if (value[i] != '&') { out.push_back(value[i++]); continue; }
    const std::size_t end = value.find(';', i + 1);
    if (end == std::string::npos || end - i > 12) { out.push_back(value[i++]); continue; }
    const std::string entity = value.substr(i + 1, end - i - 1);
    const auto known = named.find(entity);
    if (known != named.end()) out += known->second;
    else if (!entity.empty() && entity[0] == '#') {
      const bool hex = entity.size() > 2 && (entity[1] == 'x' || entity[1] == 'X');
      unsigned int code = 0;
      bool valid = true;
      for (std::size_t p = hex ? 2 : 1; p < entity.size(); ++p) {
        const int digit = hex ? hexValue(entity[p]) : (std::isdigit(static_cast<unsigned char>(entity[p])) ? entity[p] - '0' : -1);
        if (digit < 0) { valid = false; break; }
        code = code * static_cast<unsigned int>(hex ? 16 : 10) + static_cast<unsigned int>(digit);
      }
      if (valid) appendUtf8(out, code); else out += value.substr(i, end - i + 1);
    } else out += value.substr(i, end - i + 1);
    i = end + 1;
  }
  return out;
}

std::string collapseSpace(const std::string &value) {
  std::string out;
  bool pending = false;
  for (char ch : value) {
    if (std::isspace(static_cast<unsigned char>(ch))) pending = !out.empty();
    else { if (pending) out.push_back(' '); out.push_back(ch); pending = false; }
  }
  return out;
}

std::string attributeValue(const std::string &tag, const std::string &name) {
  const std::string lower = lowerAscii(tag);
  for (char quote : {'\"', '\''}) {
    const std::string needle = lowerAscii(name) + "=" + quote;
    const std::size_t start = lower.find(needle);
    if (start == std::string::npos) continue;
    const std::size_t valueStart = start + needle.size();
    const std::size_t end = tag.find(quote, valueStart);
    if (end != std::string::npos) return decodeEntities(tag.substr(valueStart, end - valueStart));
  }
  return {};
}

std::vector<std::string> openTags(const std::string &xml, const std::string &name) {
  std::vector<std::string> out;
  const std::string lower = lowerAscii(xml);
  const std::string needle = "<" + lowerAscii(name);
  std::size_t offset = 0;
  while (true) {
    const std::size_t start = lower.find(needle, offset);
    if (start == std::string::npos) break;
    const std::size_t after = start + needle.size();
    if (after < lower.size() && !std::isspace(static_cast<unsigned char>(lower[after])) && lower[after] != '>' && lower[after] != '/') {
      offset = after;
      continue;
    }
    const std::size_t end = lower.find('>', after);
    if (end == std::string::npos) break;
    out.push_back(xml.substr(start, end - start + 1));
    offset = end + 1;
  }
  return out;
}

std::string firstTag(const std::string &xml, const std::string &name) {
  const std::string lower = lowerAscii(xml);
  const std::string needle = "<" + lowerAscii(name);
  const std::size_t start = lower.find(needle);
  if (start == std::string::npos) return {};
  const std::size_t openEnd = lower.find('>', start + needle.size());
  if (openEnd == std::string::npos) return {};
  const std::size_t close = lower.find("</" + lowerAscii(name) + ">", openEnd + 1);
  if (close == std::string::npos) return {};
  std::string raw;
  bool inTag = false;
  for (std::size_t i = openEnd + 1; i < close; ++i) {
    if (xml[i] == '<') inTag = true;
    else if (xml[i] == '>') { inTag = false; raw.push_back(' '); }
    else if (!inTag) raw.push_back(xml[i]);
  }
  return decodeEntities(collapseSpace(raw));
}

void eraseElement(std::string &html, const std::string &name) {
  while (true) {
    const std::string lower = lowerAscii(html);
    const std::size_t start = lower.find("<" + name);
    if (start == std::string::npos) return;
    const std::size_t end = lower.find("</" + name + ">", start);
    if (end == std::string::npos) { html.erase(start); return; }
    html.replace(start, end + name.size() + 3 - start, " ");
  }
}

// ---- Block styling from the book's own stylesheets --------------------------
//
// Paragraphs leave the parser tagged with the visual role the EPUB's CSS gives
// them, encoded as a private-use prefix the TS layer already reserves space
// for (see epub.ts):
//   U+E000 href            an inline image; href is the resolved zip path
//   U+E001 A S F text      a styled block: A align (l/c/r), S size bucket
//                          ('0' body, '1' ~1.3x, '2' ~1.6x), F flag digit
//                          (bit0 bold, bit1 italic). Justified text renders
//                          as plain body, so it never earns a marker.
// Plain body paragraphs stay unprefixed. Only a handful of properties are
// honored (text-align, font-weight, font-style, font-size on tag/.class
// selectors) — enough to reproduce trade-book chapter openers (centered bold
// headings, centered art) without a real CSS engine.

struct CssStyle {
  int align = -1;   // 0 left, 1 center, 2 right, 3 justify
  int bold = -1;
  int italic = -1;
  int size = -1;    // 0 body, 1 large, 2 x-large
};

struct CssRule {
  std::string tag;   // empty = any tag
  std::string cls;   // empty = no class requirement
  CssStyle style;
};

std::string trimAscii(const std::string &value) {
  std::size_t start = 0;
  std::size_t end = value.size();
  while (start < end && std::isspace(static_cast<unsigned char>(value[start]))) start++;
  while (end > start && std::isspace(static_cast<unsigned char>(value[end - 1]))) end--;
  return value.substr(start, end - start);
}

// Bucket a font-size value against the body size. Anything within ~5% of the
// body stays body; medium IS the body size in these stylesheets.
int sizeBucketFromCss(const std::string &raw) {
  const std::string value = trimAscii(lowerAscii(raw));
  if (value.empty()) return -1;
  if (value == "xx-small" || value == "x-small" || value == "small" || value == "smaller" || value == "medium") return 0;
  if (value == "large" || value == "larger") return 1;
  if (value == "x-large" || value == "xx-large") return 2;
  const double number = std::atof(value.c_str());
  if (number <= 0) return -1;
  if (endsWith(value, "%")) return number <= 105 ? 0 : (number <= 145 ? 1 : 2);
  if (endsWith(value, "em") || endsWith(value, "rem")) return number <= 1.05 ? 0 : (number <= 1.45 ? 1 : 2);
  if (endsWith(value, "px") || endsWith(value, "pt")) return number <= 18 ? 0 : (number <= 26 ? 1 : 2);
  return -1;
}

void applyCssDeclarations(CssStyle &style, const std::string &block) {
  std::size_t offset = 0;
  while (offset < block.size()) {
    const std::size_t end = block.find(';', offset);
    const std::string decl = block.substr(offset, end == std::string::npos ? std::string::npos : end - offset);
    offset = end == std::string::npos ? block.size() : end + 1;
    const std::size_t colon = decl.find(':');
    if (colon == std::string::npos) continue;
    const std::string prop = trimAscii(lowerAscii(decl.substr(0, colon)));
    const std::string value = trimAscii(lowerAscii(decl.substr(colon + 1)));
    if (prop == "text-align") {
      if (value == "left") style.align = 0;
      else if (value == "center") style.align = 1;
      else if (value == "right") style.align = 2;
      else if (value == "justify") style.align = 3;
    } else if (prop == "font-weight") {
      if (value == "bold" || value == "bolder") style.bold = 1;
      else if (value == "normal") style.bold = 0;
      else { const int weight = std::atoi(value.c_str()); if (weight >= 600) style.bold = 1; else if (weight > 0) style.bold = 0; }
    } else if (prop == "font-style") {
      if (value == "italic" || value == "oblique") style.italic = 1;
      else if (value == "normal") style.italic = 0;
    } else if (prop == "font-size") {
      const int bucket = sizeBucketFromCss(value);
      if (bucket >= 0) style.size = bucket;
    }
  }
}

// Parse `selector[, selector] { declarations }` blocks. Only bare `tag`,
// `.class`, and `tag.class` selectors are kept — combinators, pseudo-classes,
// ids, and attribute selectors are beyond this reader and are skipped.
std::vector<CssRule> parseCssRules(const std::string &css) {
  std::vector<CssRule> rules;
  std::size_t offset = 0;
  while (offset < css.size()) {
    const std::size_t open = css.find('{', offset);
    if (open == std::string::npos) break;
    const std::size_t close = css.find('}', open + 1);
    if (close == std::string::npos) break;
    const std::string selectors = css.substr(offset, open - offset);
    const std::string block = css.substr(open + 1, close - open - 1);
    offset = close + 1;
    CssStyle style;
    applyCssDeclarations(style, block);
    if (style.align < 0 && style.bold < 0 && style.italic < 0 && style.size < 0) continue;
    std::size_t selStart = 0;
    while (selStart <= selectors.size()) {
      const std::size_t comma = selectors.find(',', selStart);
      const std::string selector = trimAscii(lowerAscii(selectors.substr(selStart, comma == std::string::npos ? std::string::npos : comma - selStart)));
      selStart = comma == std::string::npos ? selectors.size() + 1 : comma + 1;
      if (selector.empty()) continue;
      if (selector.find_first_of(" >+~:[#*") != std::string::npos) continue;
      CssRule rule;
      const std::size_t dot = selector.find('.');
      if (dot == std::string::npos) rule.tag = selector;
      else {
        rule.tag = selector.substr(0, dot);
        rule.cls = selector.substr(dot + 1);
        if (rule.cls.empty() || rule.cls.find('.') != std::string::npos) continue;
      }
      rule.style = style;
      rules.push_back(std::move(rule));
    }
  }
  return rules;
}

void overlayCssStyle(CssStyle &into, const CssStyle &over) {
  if (over.align >= 0) into.align = over.align;
  if (over.bold >= 0) into.bold = over.bold;
  if (over.italic >= 0) into.italic = over.italic;
  if (over.size >= 0) into.size = over.size;
}

bool classListContains(const std::string &classAttr, const std::string &cls) {
  std::size_t offset = 0;
  while (offset <= classAttr.size()) {
    const std::size_t space = classAttr.find(' ', offset);
    const std::string item = classAttr.substr(offset, space == std::string::npos ? std::string::npos : space - offset);
    if (lowerAscii(item) == cls) return true;
    if (space == std::string::npos) break;
    offset = space + 1;
  }
  return false;
}

// UA-default heading styles, then the stylesheet's matching rules in
// specificity order (tag < .class < tag.class), each pass in sheet order.
CssStyle computeBlockStyle(const std::string &tag, const std::string &classAttr, const std::vector<CssRule> &rules) {
  CssStyle style;
  if (tag.size() == 2 && tag[0] == 'h' && tag[1] >= '1' && tag[1] <= '6') {
    style.bold = 1;
    style.size = tag[1] <= '2' ? 2 : 1;
  }
  for (const auto &rule : rules)
    if (rule.cls.empty() && rule.tag == tag) overlayCssStyle(style, rule.style);
  for (const auto &rule : rules)
    if (rule.tag.empty() && !rule.cls.empty() && classListContains(classAttr, rule.cls)) overlayCssStyle(style, rule.style);
  for (const auto &rule : rules)
    if (!rule.tag.empty() && !rule.cls.empty() && rule.tag == tag && classListContains(classAttr, rule.cls)) overlayCssStyle(style, rule.style);
  return style;
}

// The 3-byte UTF-8 encodings of the marker code points.
void appendImageMarker(std::string &out) { appendUtf8(out, 0xe000); }

// Marker prefix for a computed block style, or '' when it renders as plain
// body text (left/justified, regular weight, body size).
std::string styleMarkerPrefix(const CssStyle &style) {
  const int align = style.align == 1 || style.align == 2 ? style.align : 0;
  const int size = style.size > 0 ? style.size : 0;
  const int flags = (style.bold == 1 ? 1 : 0) | (style.italic == 1 ? 2 : 0);
  if (align == 0 && size == 0 && flags == 0) return {};
  std::string prefix;
  appendUtf8(prefix, 0xe001);
  prefix.push_back(align == 1 ? 'c' : (align == 2 ? 'r' : 'l'));
  prefix.push_back(static_cast<char>('0' + size));
  prefix.push_back(static_cast<char>('0' + flags));
  return prefix;
}

std::vector<std::string> stripMarkup(const std::string &source,
                                     const std::vector<CssRule> &rules = {},
                                     const std::string &chapterPath = {}) {
  std::string html = source;
  const std::string lower = lowerAscii(html);
  const std::size_t body = lower.find("<body");
  if (body != std::string::npos) {
    const std::size_t openEnd = lower.find('>', body);
    const std::size_t close = lower.rfind("</body>");
    if (openEnd != std::string::npos && close > openEnd) html = html.substr(openEnd + 1, close - openEnd - 1);
  }
  eraseElement(html, "script");
  eraseElement(html, "style");
  eraseElement(html, "svg");

  std::vector<std::string> paragraphs;
  // Effective (ancestor-merged) style per open block; the top entry styles the
  // paragraph being accumulated. <br/> flushes without popping, so a heading
  // split across <br/>s yields one styled paragraph per visual line.
  std::vector<CssStyle> blockStack;
  std::string line;
  const auto flushLine = [&]() {
    const std::string clean = collapseSpace(decodeEntities(line));
    line.clear();
    if (clean.empty()) return;
    const std::string prefix = blockStack.empty() ? std::string() : styleMarkerPrefix(blockStack.back());
    paragraphs.push_back(prefix + clean);
  };

  bool inTag = false;
  std::string tag;
  for (char ch : html) {
    if (ch == '<') { inTag = true; tag.clear(); continue; }
    if (inTag && ch == '>') {
      inTag = false;
      const std::string rawTag = collapseSpace(tag);
      const std::string lowerTag = lowerAscii(rawTag);
      const bool closing = !lowerTag.empty() && lowerTag[0] == '/';
      const std::size_t nameStart = closing ? 1 : 0;
      const std::size_t nameEnd = lowerTag.find_first_of(" /\t\r\n", nameStart);
      const std::string name = lowerTag.substr(nameStart, nameEnd - nameStart);
      const bool block = name == "p" || name == "div" || name == "section" ||
                         name == "article" || name == "aside" || name == "header" ||
                         name == "footer" || name == "blockquote" || name == "pre" ||
                         name == "li" || name == "dt" || name == "dd" ||
                         name == "tr" || name == "h1" || name == "h2" ||
                         name == "h3" || name == "h4" || name == "h5" || name == "h6";
      if (name == "img" && !closing) {
        flushLine();
        const std::string src = attributeValue("<" + rawTag + ">", "src");
        if (!src.empty()) {
          std::string marker;
          appendImageMarker(marker);
          marker += resolvePath(chapterPath, src);
          paragraphs.push_back(std::move(marker));
        }
      } else if (name == "br") {
        flushLine();
      } else if (block) {
        flushLine();
        if (closing) {
          if (!blockStack.empty()) blockStack.pop_back();
        } else {
          CssStyle style = blockStack.empty() ? CssStyle{} : blockStack.back();
          // A nested block inherits align/italic context but never its
          // parent's heading scale or weight (a <p> inside a chapter <div>
          // is body text, not a heading).
          style.bold = -1;
          style.size = -1;
          overlayCssStyle(style, computeBlockStyle(name, attributeValue("<" + rawTag + ">", "class"), rules));
          const bool selfClosing = !lowerTag.empty() && lowerTag.back() == '/';
          if (!selfClosing) blockStack.push_back(style);
        }
      }
      continue;
    }
    if (inTag) tag.push_back(ch); else line.push_back(ch);
  }
  flushLine();
  return paragraphs;
}

// Output uses ASCII separator control characters (see kRecord/kField/kValue in
// the flat format below); strip control bytes from text so book content can
// never alias a separator. Multi-byte UTF-8 passes through untouched.
void appendSanitized(std::string &out, const std::string &value) {
  for (unsigned char ch : value) {
    if (ch >= 32) out.push_back(static_cast<char>(ch));
    else if (ch == '\n' || ch == '\r' || ch == '\t') out.push_back(' ');
  }
}

const ManifestItem *findManifest(const std::vector<ManifestItem> &items, const std::string &id) {
  for (const auto &item : items) if (item.id == id) return &item;
  return nullptr;
}

void traceFailure(const char *message, const std::string &detail = {}) {
#ifdef EPUB_ARCHIVE_TEST_MAIN
  std::fprintf(stderr, "[epub] %s%s%s\n", message, detail.empty() ? "" : ": ", detail.c_str());
#else
  (void)message;
  (void)detail;
#endif
}

}  // namespace

// A whole novel decompresses to several MB; on an embedded heap the archive
// bytes + every extracted file + the serialized output do not fit at once.
// Extract lazily: only the file being processed is ever resident.
std::string extractZipText(ZipFile &zip, const std::vector<ZipEntry> &entries, const std::string &wanted) {
  const std::string normalized = lowerAscii(normalizePath(wanted));
  if (normalized.empty()) return {};
  for (const auto &entry : entries) {
    if (!keepTextEntry(entry.name)) continue;
    if (lowerAscii(normalizePath(entry.name)) != normalized) continue;
    std::string text;
    if (!extractEntry(zip, entry, text)) { traceFailure("entry extraction failed", entry.name); return {}; }
    return text;
  }
  return {};
}

struct OpfDocument {
  std::string opfPath;
  std::string opf;
  std::string title;
  std::string author;
};

bool loadOpfDocument(ZipFile &zip,
                     const std::vector<ZipEntry> &entries,
                     const std::string &fallbackTitle,
                     const std::string &fallbackAuthor,
                     OpfDocument &doc) {
  const std::string container = extractZipText(zip, entries, "META-INF/container.xml");
  const auto roots = openTags(container, "rootfile");
  if (!roots.empty()) doc.opfPath = normalizePath(attributeValue(roots[0], "full-path"));
  if (doc.opfPath.empty()) {
    for (const auto &entry : entries) if (endsWith(lowerAscii(entry.name), ".opf")) { doc.opfPath = normalizePath(entry.name); break; }
  }
  doc.opf = extractZipText(zip, entries, doc.opfPath);
  if (doc.opf.empty()) { traceFailure("package document missing", doc.opfPath); return false; }
  doc.title = firstTag(doc.opf, "dc:title");
  if (doc.title.empty()) doc.title = firstTag(doc.opf, "title");
  if (doc.title.empty()) doc.title = fallbackTitle;
  doc.author = firstTag(doc.opf, "dc:creator");
  if (doc.author.empty()) doc.author = firstTag(doc.opf, "creator");
  if (doc.author.empty()) doc.author = fallbackAuthor;
  return true;
}


// The stable chapter enumeration shared by spine() and chapter(): every
// itemref whose idref resolves in the manifest, in spine order. Content is NOT
// inspected here — chapter(k) must be able to address the k-th entry without
// extracting the preceding ones.
std::vector<std::string> spineHrefs(const OpfDocument &doc) {
  std::vector<ManifestItem> manifest;
  for (const auto &tag : openTags(doc.opf, "item")) {
    ManifestItem item{attributeValue(tag, "id"), attributeValue(tag, "href"), attributeValue(tag, "media-type")};
    if (!item.id.empty() && !item.href.empty()) manifest.push_back(std::move(item));
  }
  std::vector<std::string> hrefs;
  for (const auto &tag : openTags(doc.opf, "itemref")) {
    const std::string id = attributeValue(tag, "idref");
    const ManifestItem *item = findManifest(manifest, id);
    if (!item) continue;
    hrefs.push_back(resolvePath(doc.opfPath, item->href));
  }
  return hrefs;
}

// Tiny text-file IO for the app's pagination cache. std::string carries the
// UTF-8 bytes straight through — no TS-side encode/decode (a per-byte
// Uint8Array walk took ~20s on device through the boxed typed-array path).
std::string readTextFile(const std::string &path) {
  std::FILE *file = std::fopen(path.c_str(), "rb");
  if (!file) return {};
  std::fseek(file, 0, SEEK_END);
  const long size = std::ftell(file);
  std::fseek(file, 0, SEEK_SET);
  std::string out;
  if (size > 0 && size <= 1024 * 1024) {
    out.resize(static_cast<std::size_t>(size));
    const auto got = std::fread(out.data(), 1, out.size(), file);
    out.resize(got);
  }
  std::fclose(file);
  return out;
}

bool writeTextFile(const std::string &path, const std::string &text) {
  // Create the immediate parent directory (e.g. /sdcard/.folio) if missing.
  const auto slash = path.rfind('/');
  if (slash != std::string::npos && slash > 0) {
    ::mkdir(path.substr(0, slash).c_str(), 0775);
  }
  std::FILE *file = std::fopen(path.c_str(), "wb");
  if (!file) return false;
  const auto wrote = std::fwrite(text.data(), 1, text.size(), file);
  std::fclose(file);
  return wrote == text.size();
}

// One book stays "open" across calls: opening the zip, walking the central
// directory, and parsing the package document once per CALL made a book open
// take a minute on device (N chapters × N re-parses over SD). The reader is
// single-tasked, so a single cached session suffices; a different path
// replaces it.
struct BookSession {
  std::string path;
  ZipFile zip;
  std::vector<ZipEntry> entries;
  std::vector<std::string> hrefs;
  std::string title;
  std::string author;
  // Retained so cover/image extraction can resolve manifest hrefs without
  // re-reading the package document.
  std::string opf;
  std::string opfPath;
  // Parsed stylesheet rules keyed by normalized zip path — chapters share a
  // handful of sheets, so each is inflated and parsed once per book.
  std::unordered_map<std::string, std::vector<CssRule>> cssRules;
  bool valid = false;
};

BookSession &bookSession() {
  static BookSession session;
  return session;
}

bool ensureBookSession(const std::string &path) {
  BookSession &session = bookSession();
  if (session.valid && session.path == path) return true;
  session.valid = false;
  session.entries.clear();
  session.hrefs.clear();
  session.title.clear();
  session.author.clear();
  session.cssRules.clear();
  if (!session.zip.open(path)) { traceFailure("file is empty", path); return false; }
  if (!zipEntries(session.zip, session.entries)) { traceFailure("zip directory failed", path); return false; }
  OpfDocument doc;
  if (!loadOpfDocument(session.zip, session.entries, "", "", doc)) return false;
  session.hrefs = spineHrefs(doc);
  session.title = doc.title;
  session.author = doc.author;
  session.opf = doc.opf;
  session.opfPath = doc.opfPath;
  session.path = path;
  session.valid = true;
  return true;
}

std::string meta(const std::string &path,
                 const std::string &fallbackTitle,
                 const std::string &fallbackAuthor) {
  if (!ensureBookSession(path)) return {};
  const BookSession &session = bookSession();
  const std::string &title = session.title.empty() ? fallbackTitle : session.title;
  const std::string &author = session.author.empty() ? fallbackAuthor : session.author;
  std::string out;
  out.reserve(title.size() + author.size() + 16);
  appendSanitized(out, title);
  out.push_back('\x1d');
  appendSanitized(out, author);
  out.push_back('\x1d');
  out += std::to_string(session.hrefs.size());
  return out;
}

// One spine entry: "title \x1d para \x1f para ...". With the cached session
// this is a single entry inflate — the page-turn workhorse, and the open-time
// anchor pass calls it once per chapter.
// The chapter's linked stylesheet rules, concatenated in document order. Each
// sheet is inflated + parsed once per book session.
std::vector<CssRule> chapterCssRules(BookSession &session, const std::string &html, const std::string &chapterPath) {
  std::vector<CssRule> rules;
  for (const auto &tag : openTags(html, "link")) {
    const std::string rel = lowerAscii(attributeValue(tag, "rel"));
    const std::string href = attributeValue(tag, "href");
    if (href.empty()) continue;
    if (rel.find("stylesheet") == std::string::npos && !endsWith(lowerAscii(href), ".css")) continue;
    const std::string cssPath = resolvePath(chapterPath, href);
    if (!endsWith(lowerAscii(cssPath), ".css")) continue;
    auto cached = session.cssRules.find(cssPath);
    if (cached == session.cssRules.end()) {
      const std::string css = extractZipText(session.zip, session.entries, cssPath);
      cached = session.cssRules.emplace(cssPath, parseCssRules(css)).first;
    }
    rules.insert(rules.end(), cached->second.begin(), cached->second.end());
  }
  return rules;
}

std::string chapter(const std::string &path, double spineIndex) {
  if (!ensureBookSession(path)) return {};
  BookSession &session = bookSession();
  const long long index = static_cast<long long>(spineIndex);
  if (index < 0 || index >= static_cast<long long>(session.hrefs.size())) return {};
  const std::string chapterPath = session.hrefs[static_cast<std::size_t>(index)];
  const std::string html = extractZipText(session.zip, session.entries, chapterPath);
  std::string chapterTitle = firstTag(html, "h1");
  if (chapterTitle.empty()) chapterTitle = firstTag(html, "h2");
  if (chapterTitle.empty()) chapterTitle = firstTag(html, "title");
  if (chapterTitle.empty()) chapterTitle = "Chapter " + std::to_string(index + 1);
  const auto paragraphs = html.empty()
      ? std::vector<std::string>{}
      : stripMarkup(html, chapterCssRules(session, html, chapterPath), chapterPath);
  std::string out;
  std::size_t estimate = chapterTitle.size() + 1;
  for (const auto &paragraph : paragraphs) estimate += paragraph.size() + 1;
  out.reserve(estimate);
  appendSanitized(out, chapterTitle);
  out.push_back('\x1d');
  for (std::size_t p = 0; p < paragraphs.size(); ++p) {
    if (p) out.push_back('\x1f');
    appendSanitized(out, paragraphs[p]);
  }
  return out;
}

// Resolve the cover image's zip path from the package document. EPUB2 points to
// it with <meta name="cover" content="ID">; EPUB3 marks the manifest item with
// properties="cover-image". Fall back to a manifest image whose id/href says
// "cover", then to the first image item.
std::string coverHref(const std::string &opf, const std::string &opfPath) {
  struct CoverItem {
    std::string id;
    std::string href;
    std::string media;
    std::string props;
  };
  std::vector<CoverItem> items;
  for (const auto &tag : openTags(opf, "item")) {
    CoverItem it{attributeValue(tag, "id"), attributeValue(tag, "href"),
                 lowerAscii(attributeValue(tag, "media-type")), lowerAscii(attributeValue(tag, "properties"))};
    if (!it.id.empty() && !it.href.empty()) items.push_back(std::move(it));
  }
  const auto isImage = [](const std::string &mt) { return mt.rfind("image/", 0) == 0; };

  std::string coverId;
  for (const auto &tag : openTags(opf, "meta")) {
    if (lowerAscii(attributeValue(tag, "name")) == "cover") {
      coverId = attributeValue(tag, "content");
      break;
    }
  }
  if (!coverId.empty())
    for (const auto &it : items)
      if (it.id == coverId) return resolvePath(opfPath, it.href);

  for (const auto &it : items)
    if (it.props.find("cover-image") != std::string::npos) return resolvePath(opfPath, it.href);

  for (const auto &it : items)
    if (isImage(it.media) &&
        (lowerAscii(it.id).find("cover") != std::string::npos || lowerAscii(it.href).find("cover") != std::string::npos))
      return resolvePath(opfPath, it.href);

  for (const auto &it : items)
    if (isImage(it.media)) return resolvePath(opfPath, it.href);
  return {};
}

// Extract a zip entry (any type — unlike extractZipText's text-only filter) by
// its already-normalized path and return the raw bytes. Returned as a byte
// vector (→ Uint8Array in TS, like inflateRaw), never a string: binary image
// bytes are not valid UTF-8. The app decodes them with loadImage(bytes).
std::vector<std::uint8_t> extractZipEntryBytes(ZipFile &zip, const std::vector<ZipEntry> &entries,
                                               const std::string &wanted) {
  const std::string normalized = lowerAscii(normalizePath(wanted));
  if (normalized.empty()) return {};
  for (const auto &entry : entries) {
    if (lowerAscii(normalizePath(entry.name)) != normalized) continue;
    std::string bytes;
    if (!extractEntry(zip, entry, bytes)) return {};
    return std::vector<std::uint8_t>(bytes.begin(), bytes.end());
  }
  return {};
}

// The book's cover image bytes (empty when it has no cover). Uses the cached
// session so a library scan pays one zip open per book.
std::vector<std::uint8_t> coverBytes(const std::string &path) {
  if (!ensureBookSession(path)) return {};
  BookSession &session = bookSession();
  const std::string href = coverHref(session.opf, session.opfPath);
  if (href.empty()) return {};
  return extractZipEntryBytes(session.zip, session.entries, href);
}

// Extract the book's cover image to an absolute file (typically on SD) so the
// cover page can render it with a plain <img src="/sdcard/..."> — the engine
// loads that path at setAttribute time. Returns true when the file exists after
// the call. Acts as a cache: an already-present target is left untouched (no
// re-extraction), so reopening a book pays the zip cost once. Returns false when
// the book has no cover, so the caller can fall back to the text title card.
bool cacheCover(const std::string &path, const std::string &outPath) {
  if (outPath.empty()) return false;
  // Already cached from a previous open — reuse it.
  if (std::FILE *existing = std::fopen(outPath.c_str(), "rb")) {
    std::fseek(existing, 0, SEEK_END);
    const long size = std::ftell(existing);
    std::fclose(existing);
    if (size > 0) return true;
  }
  const std::vector<std::uint8_t> bytes = coverBytes(path);
  if (bytes.empty()) return false;
  const auto slash = outPath.rfind('/');
  if (slash != std::string::npos && slash > 0) {
    ::mkdir(outPath.substr(0, slash).c_str(), 0775);
  }
  std::FILE *file = std::fopen(outPath.c_str(), "wb");
  if (!file) return false;
  const auto wrote = std::fwrite(bytes.data(), 1, bytes.size(), file);
  std::fclose(file);
  return wrote == bytes.size();
}


// Raw "GTHM" grayscale thumbnail writer: 8-byte header (magic, u16le w,
// u16le h) + w*h 8-bit gray pixels. The engine's ImageStore decodes it with a
// straight per-pixel copy -- no codec, so a library full of thumbs loads fast.
static bool writeGrayThumb(const std::string &outPath, const std::uint8_t *gray, int w, int h) {
  const auto slash = outPath.rfind('/');
  if (slash != std::string::npos && slash > 0) {
    ::mkdir(outPath.substr(0, slash).c_str(), 0775);
  }
  std::FILE *file = std::fopen(outPath.c_str(), "wb");
  if (!file) return false;
  const std::uint8_t header[8] = {
      'G', 'T', 'H', 'M',
      static_cast<std::uint8_t>(w & 0xFF), static_cast<std::uint8_t>((w >> 8) & 0xFF),
      static_cast<std::uint8_t>(h & 0xFF), static_cast<std::uint8_t>((h >> 8) & 0xFF)};
  bool ok = std::fwrite(header, 1, sizeof(header), file) == sizeof(header);
  if (ok) ok = std::fwrite(gray, 1, static_cast<std::size_t>(w) * h, file) == static_cast<std::size_t>(w) * h;
  std::fclose(file);
  return ok;
}

bool thumbnailCover(const std::string &path, const std::string &thumbPath, double maxWIn, double maxHIn) {
  if (thumbPath.empty()) return false;
  // Already generated by a previous scan -- reuse it.
  if (std::FILE *existing = std::fopen(thumbPath.c_str(), "rb")) {
    std::fseek(existing, 0, SEEK_END);
    const long size = std::ftell(existing);
    std::fclose(existing);
    if (size > 0) return true;
  }
  const int maxW = static_cast<int>(maxWIn);
  const int maxH = static_cast<int>(maxHIn);
  if (maxW <= 0 || maxH <= 0) return false;
  const std::vector<std::uint8_t> bytes = coverBytes(path);
  if (bytes.empty()) return false;
  // Decode through ImageStore so the memory-safe cascade applies (large JPEGs
  // take the descaling ROM decoder on device instead of exhausting PSRAM).
  auto &store = gea::framework::graphics::ImageStore::instance();
  const int id = store.decodeOpaque(bytes.data(), static_cast<int>(bytes.size()));
  if (id < 0) return false;
  const int w = store.width(id);
  const int h = store.height(id);
  const gea::framework::graphics::pixel::native_t *px = store.currentPixels(id);
  if (!px || w <= 0 || h <= 0) {
    store.dispose(id);
    return false;
  }
  // Contain-fit with the driving dimension EXACT (and never upscaled), so the
  // library <img fit="contain"> resolves to scale 1.0 and blits pixel-for-pixel.
  int tw = 0;
  int th = 0;
  if (static_cast<long long>(w) * maxH <= static_cast<long long>(h) * maxW) {
    th = std::min(maxH, h);
    tw = std::max(1, (w * th + h / 2) / h);
  } else {
    tw = std::min(maxW, w);
    th = std::max(1, (h * tw + w / 2) / w);
  }
  // Box-downsample to 8-bit luma (area averaging keeps cover art clean).
  std::vector<std::uint8_t> gray(static_cast<std::size_t>(tw) * th);
  for (int ty = 0; ty < th; ty++) {
    const int sy0 = static_cast<int>(static_cast<long long>(ty) * h / th);
    int sy1 = static_cast<int>(static_cast<long long>(ty + 1) * h / th);
    if (sy1 <= sy0) sy1 = sy0 + 1;
    for (int tx = 0; tx < tw; tx++) {
      const int sx0 = static_cast<int>(static_cast<long long>(tx) * w / tw);
      int sx1 = static_cast<int>(static_cast<long long>(tx + 1) * w / tw);
      if (sx1 <= sx0) sx1 = sx0 + 1;
      int sum = 0;
      for (int sy = sy0; sy < sy1; sy++) {
        for (int sx = sx0; sx < sx1; sx++) {
          int r = 0, g = 0, b = 0, a = 0;
          gea::framework::graphics::pixel::unpackNative8(px[static_cast<std::size_t>(sy) * w + sx], &r, &g, &b, &a);
          sum += gea::framework::graphics::pixel::grayLuma8(r, g, b);
        }
      }
      gray[static_cast<std::size_t>(ty) * tw + tx] =
          static_cast<std::uint8_t>(sum / ((sy1 - sy0) * (sx1 - sx0)));
    }
  }
  store.dispose(id);
  // Compose the full tile: white paper background with the cover contain-fit,
  // BOTTOM-aligned and horizontally centered. Baking the alignment into the
  // thumbnail keeps the tile <img> a plain 1:1 blit (no object-position
  // support needed) and books of any aspect sit on a common baseline.
  std::vector<std::uint8_t> tile(static_cast<std::size_t>(maxW) * maxH, 255);
  const int ox = (maxW - tw) / 2;
  const int oy = maxH - th;
  for (int ty = 0; ty < th; ty++) {
    std::memcpy(tile.data() + static_cast<std::size_t>(oy + ty) * maxW + ox,
                gray.data() + static_cast<std::size_t>(ty) * tw,
                static_cast<std::size_t>(tw));
  }
  return writeGrayThumb(thumbPath, tile.data(), maxW, maxH);
}

// An inline image's bytes (its href already resolved to a zip path by the
// chapter markers).
std::vector<std::uint8_t> imageBytes(const std::string &path, const std::string &href) {
  if (href.empty() || !ensureBookSession(path)) return {};
  BookSession &session = bookSession();
  return extractZipEntryBytes(session.zip, session.entries, href);
}

std::string parse(const std::string &path,
                  const std::string &fallbackTitle,
                  const std::string &fallbackAuthor) {
  ZipFile zip;
  std::vector<ZipEntry> entries;
  if (!zip.open(path)) { traceFailure("file is empty", path); return {}; }
  if (!zipEntries(zip, entries)) { traceFailure("zip directory failed", path); return {}; }
  OpfDocument doc;
  if (!loadOpfDocument(zip, entries, fallbackTitle, fallbackAuthor, doc)) return {};
  const std::string &opf = doc.opf;
  const std::string &opfPath = doc.opfPath;
  const std::string &title = doc.title;
  const std::string &author = doc.author;

  std::vector<ManifestItem> manifest;
  for (const auto &tag : openTags(opf, "item")) {
    ManifestItem item{attributeValue(tag, "id"), attributeValue(tag, "href"), attributeValue(tag, "media-type")};
    if (!item.id.empty() && !item.href.empty()) manifest.push_back(std::move(item));
  }
  std::vector<Chapter> chapters;
  for (const auto &tag : openTags(opf, "itemref")) {
    const std::string id = attributeValue(tag, "idref");
    const ManifestItem *item = findManifest(manifest, id);
    if (!item) continue;
    const std::string html = extractZipText(zip, entries, resolvePath(opfPath, item->href));
    if (html.empty()) continue;
    auto paragraphs = stripMarkup(html);
    if (paragraphs.empty()) continue;
    std::string chapterTitle = firstTag(html, "h1");
    if (chapterTitle.empty()) chapterTitle = firstTag(html, "h2");
    if (chapterTitle.empty()) chapterTitle = firstTag(html, "title");
    if (chapterTitle.empty()) chapterTitle = "Chapter " + std::to_string(chapters.size() + 1);
    chapters.push_back(Chapter{id, std::move(chapterTitle), std::move(paragraphs)});
  }
  if (chapters.empty()) { traceFailure("no readable spine chapters", opfPath); return {}; }

  // Flat delimited format instead of JSON: the caller decodes it with native
  // string splits, so the multi-MB book never round-trips through a boxed
  // JSON value tree (which exhausted the 4 MB PSRAM heap on device).
  //   header record:   title \x1d author
  //   chapter records: id \x1d title \x1d para \x1f para \x1f ...
  //   records joined by \x1e
  // Serialize destructively: reserve the estimated size up front (append growth
  // otherwise doubles through multi-MB reallocations) and release each
  // chapter's text as soon as it is encoded, so the chapter list and the
  // output never coexist in full.
  constexpr char kRecord = '\x1e';
  constexpr char kField = '\x1d';
  constexpr char kValue = '\x1f';
  std::size_t estimate = 8 + title.size() + author.size();
  for (const auto &chapter : chapters) {
    estimate += 4 + chapter.id.size() + chapter.title.size();
    for (const auto &paragraph : chapter.paragraphs) estimate += paragraph.size() + 1;
  }
  std::string out;
  out.reserve(estimate);
  appendSanitized(out, title);
  out.push_back(kField);
  appendSanitized(out, author);
  for (std::size_t i = 0; i < chapters.size(); ++i) {
    auto &chapter = chapters[i];
    out.push_back(kRecord);
    appendSanitized(out, chapter.id);
    out.push_back(kField);
    appendSanitized(out, chapter.title);
    out.push_back(kField);
    for (std::size_t p = 0; p < chapter.paragraphs.size(); ++p) {
      if (p) out.push_back(kValue);
      appendSanitized(out, chapter.paragraphs[p]);
      chapter.paragraphs[p] = std::string();
    }
    chapter = Chapter{};
  }
  return out;
}

}  // namespace gea::host::epub_archive

#ifdef EPUB_ARCHIVE_TEST_MAIN
#include <iostream>
// Usage: epub_test <file.epub>            -> whole-book parse() stream
//        epub_test <file.epub> <spine-N>  -> chapter(N) stream (the app path,
//                                            with stylesheet-derived markers)
int main(int argc, char **argv) {
  if (argc < 2) return 2;
  if (argc >= 3) {
    const std::string out = gea::host::epub_archive::chapter(argv[1], std::atof(argv[2]));
    if (out.empty()) return 1;
    std::cout << out;
    return 0;
  }
  const std::string json = gea::host::epub_archive::parse(argv[1], "Fallback", "Unknown");
  if (json.empty()) return 1;
  std::cout << json;
  return 0;
}
#endif
