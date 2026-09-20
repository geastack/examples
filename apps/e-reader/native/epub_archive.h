// SPDX-License-Identifier: MIT
#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace gea::host::epub_archive {

std::vector<std::uint8_t> inflateRaw(const std::vector<std::uint8_t> &source,
                                     double outputLength);
std::string parse(const std::string &path,
                  const std::string &fallbackTitle,
                  const std::string &fallbackAuthor);
// "title \x1d author \x1d chapterCount" — reads just the container + package
// documents, so a library scan can show real metadata without parsing books.
std::string meta(const std::string &path,
                 const std::string &fallbackTitle,
                 const std::string &fallbackAuthor);
// Pagination-cache text IO: whole-file read (empty when missing / oversized)
// and write (parent dir created). Strings carry raw UTF-8 bytes.
std::string readTextFile(const std::string &path);
bool writeTextFile(const std::string &path, const std::string &text);
// One spine entry: "title \x1d para \x1f para ...". Empty when out of
// range/unreadable. Served from a cached per-book session, so repeated calls
// cost one entry inflate each.
std::string chapter(const std::string &path, double spineIndex);
// The book's cover image bytes (or an inline image's bytes by resolved href)
// from the EPUB zip. Returned as a byte vector (→ Uint8Array), like inflateRaw,
// so binary image data never crosses as a string; the app decodes it with
// loadImage(bytes). Empty when absent/unreadable.
std::vector<std::uint8_t> coverBytes(const std::string &path);
bool cacheCover(const std::string &path, const std::string &outPath);
// Create (once) a small grayscale thumbnail of the book's cover for the
// library grid: contain-fit into maxW x maxH with the DRIVING dimension exact,
// so the on-screen <img fit="contain"> draws it 1:1 (no runtime rescale).
// Written as an 8-bit grayscale BMP the engine's decoder loads directly.
// Acts as a cache like cacheCover: an existing target is left untouched.
// Returns true when the thumb file exists after the call; false = no cover.
bool thumbnailCover(const std::string &path, const std::string &thumbPath, double maxW, double maxH);
std::vector<std::uint8_t> imageBytes(const std::string &path, const std::string &href);

}  // namespace gea::host::epub_archive
