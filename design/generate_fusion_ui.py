from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import os

W, H = 1080, 1920
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "灵感APP_UI融合方案13_孙正义三词组合法_聚焦版.png"

def font(size, weight="regular"):
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            index = 2 if weight == "semibold" and "PingFang" in path else 0
            try:
                return ImageFont.truetype(path, size=size, index=index)
            except OSError:
                return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()

F = {
    "brand": font(72, "semibold"), "tag": font(25), "badge": font(23),
    "eyebrow": font(21), "word_top": font(58, "semibold"),
    "word_bottom": font(54, "semibold"), "meta": font(23),
    "section": font(38, "semibold"), "body": font(27),
    "placeholder": font(27), "button": font(32, "semibold"),
    "nav": font(21), "small": font(20),
}

C = {
    "bg": (248, 250, 249), "surface": (255, 255, 252), "ink": (26, 28, 28),
    "muted": (124, 126, 121), "line": (218, 220, 214), "teal": (33, 112, 105),
    "teal_soft": (228, 241, 239), "red": (174, 54, 42), "red_dark": (156, 48, 39),
    "gold": (184, 132, 57), "oracle": (205, 174, 119), "nav": (238, 242, 240),
}

img = Image.new("RGB", (W, H), C["bg"])
d = ImageDraw.Draw(img)

def rr(box, radius, fill, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def text(xy, value, f, fill, anchor=None):
    d.text(xy, value, font=f, fill=fill, anchor=anchor)

def center(box, value, f, fill):
    x1, y1, x2, y2 = box
    text(((x1+x2)/2, (y1+y2)/2-2), value, f, fill, "mm")

def oracle_trace(points, alpha_color=C["oracle"], width=1):
    d.line(points, fill=alpha_color, width=width, joint="curve")

# Header.
text((72, 65), "灵感", F["brand"], C["ink"])
text((76, 154), "随机组合，强制关联", F["tag"], C["muted"])
rr((790, 78, 1008, 140), 31, C["teal_soft"])
center((790, 78, 1008, 140), "三词组合法", F["badge"], C["teal"])

# Compact state row.
text((72, 248), "今日三词", F["eyebrow"], C["muted"])
text((1008, 248), "05:00", F["eyebrow"], C["teal"], "ra")

# Main triangular word constellation. Enlarged to dominate the first screen.
top = (290, 320, 790, 570)
left = (72, 690, 500, 970)
right = (580, 690, 1008, 970)

for box in (top, left, right):
    rr(box, 30, C["surface"], C["line"], 2)

# Very restrained tech-style connection system.
hub = (540, 650)
d.line((540, 570, 540, 625), fill=(131, 167, 161), width=2)
d.line((500, 815, 515, 681), fill=(131, 167, 161), width=2)
d.line((580, 815, 565, 681), fill=(131, 167, 161), width=2)
d.ellipse((506, 616, 574, 684), fill=C["bg"], outline=(193, 214, 210), width=2)
d.ellipse((518, 628, 562, 672), fill=C["red"])
d.ellipse((535, 645, 545, 655), fill=(255, 221, 132))

# Top card.
text((330, 358), "随机词  01", F["eyebrow"], C["red"])
text((540, 448), "AI眼镜", F["word_top"], C["ink"], "mm")
text((540, 526), "可穿戴智能设备", F["meta"], C["muted"], "mm")

# Bottom cards.
text((112, 733), "随机词  02", F["eyebrow"], C["teal"])
text((112, 808), "独居老人", F["word_bottom"], C["ink"])
text((112, 902), "独自居住的老年人", F["meta"], C["muted"])

text((620, 733), "随机词  03", F["eyebrow"], C["gold"])
text((620, 808), "药盒", F["word_bottom"], C["ink"])
text((620, 902), "存放药品的容器", F["meta"], C["muted"])

# One line of guidance; no duplicate black summary bar.
text((72, 1040), "让不相关的词发生关系", F["section"], C["ink"])
text((74, 1092), "先写下第一直觉，不必急着让它合理。", F["body"], C["muted"])

# Real product input area.
rr((72, 1170, 1008, 1428), 30, C["surface"], C["line"], 2)
text((112, 1210), "第一念", F["eyebrow"], C["teal"])
text((112, 1275), "如果这三个词组成一个产品、服务或故事……", F["placeholder"], C["muted"])
text((112, 1375), "草稿会自动保存在本机", F["small"], (160, 162, 156))

# Clear primary action and quiet secondary actions.
rr((150, 1495, 930, 1605), 55, C["red_dark"])
center((150, 1495, 930, 1605), "保存这条灵感", F["button"], (255, 250, 244))

for box, label in [
    ((72, 1650, 336, 1726), "换一组"),
    ((408, 1650, 672, 1726), "锁定词"),
    ((744, 1650, 1008, 1726), "发送给 AI"),
]:
    rr(box, 38, C["bg"], C["line"], 2)
    center(box, label, F["nav"], C["ink"] if label != "换一组" else C["muted"])

# Bottom navigation hint, deliberately subtle.
d.line((0, 1790, W, 1790), fill=C["nav"], width=2)
nav_items = [(135, "生成"), (405, "词库"), (675, "灵感库"), (945, "关于")]
for x, label in nav_items:
    color = C["red"] if label == "生成" else C["muted"]
    if label == "生成":
        d.ellipse((x-5, 1824, x+5, 1834), fill=C["red"])
    text((x, 1870), label, F["nav"], color, "mm")

img.save(OUT, quality=96)
print(OUT)
