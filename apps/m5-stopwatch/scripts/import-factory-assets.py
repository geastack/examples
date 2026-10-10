"""Reproduce MIT factory artwork; no LVGL dependency or reference checkout."""
import io, json, pathlib, re, urllib.request, wave
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]
REV = '6b4aa125288b6fe9dca661f10159f6e1e5ee785c'
BASE = f'https://raw.githubusercontent.com/m5stack/M5StopWatch-UserDemo/{REV}/'
def get(path):
    return urllib.request.urlopen(BASE + path).read()
names = ['icon_clock','icon_watch_face','icon_stopwatch','icon_badge','icon_imu','icon_fft','icon_lucky_wheel','icon_setup','alarm_icon','go_home_guide','lucky_wheel_pointer','icon_indicator_left','icon_indicator_right','icon_bat_lightning']
paths = [f'main/assets/images/{name}.c' for name in names]
paths += [f'main/assets/images/watch_face/big_number/big_number_{n}.c' for n in range(10)]
paths += [f'main/assets/images/watch_face/classic/classic_{name}_hand.c' for name in ['hour','minute','second']]
palettes = [[0xCBDB8C,0xD3EA71,0xE9F5B8,0x94A350],[0xD1F3BF,0xCDFCB9,0xF8FEE9,0x84D86D],[0xDB9D7D,0xE8D780,0xF4EBC0,0xF2B050],[0xB49EDB,0x9BC1FF,0xC4C9FA,0xAF94E7]]
for path in paths:
    text = get(path).decode()
    width = int(re.search(r'\.header.w\s*=\s*(\d+)',text)[1])
    height = int(re.search(r'\.header.h\s*=\s*(\d+)',text)[1])
    data = bytes(int(x,16) for x in re.findall(r'0x([0-9a-fA-F]{2})', text.split('_map[] = {')[1].split('};')[0]))
    count = width*height
    assert len(data) == count*(3 if 'LV_COLOR_FORMAT_RGB565A8' in text else 2), path
    pixels=[]
    for n in range(count):
        v=data[n*2] | (data[n*2+1]<<8)
        pixels.append((((v>>11)&31)*255//31,((v>>5)&63)*255//63,(v&31)*255//31,data[count*2+n] if len(data)==count*3 else 255))
    image=Image.new('RGBA',(width,height)); image.putdata(pixels)
    name=pathlib.Path(path).stem
    image.save(ROOT/'assets'/f'{name}.png')
    if name.startswith('big_number'):
        for palette in range(4):
            for position in range(4):
                color=palettes[palette][position]
                tinted=Image.new('RGBA',image.size,((color>>16)&255,(color>>8)&255,color&255,255))
                tinted.putalpha(image.getchannel('A'))
                tinted.save(ROOT/'assets'/f'{name}_p{palette}_{position}.png')
ROOT.joinpath('assets/badge-config.html').write_bytes(get('main/hal/utils/config_ap/assets/badge_config_ap.html'))
with wave.open(str(ROOT/'assets/boot-sfx.wav'),'wb') as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(44100)
    audio.writeframes(get('main/assets/sfx/boot_sfx.bin'))
ROOT.joinpath('assets/M5Stack-LICENSE').write_bytes(get('LICENSE'))
print(f'Imported artwork, badge editor and boot sound from {REV}')
