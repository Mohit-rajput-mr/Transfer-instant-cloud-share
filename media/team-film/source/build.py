# video.html = video.tpl.html with the shared look (styles) of the launch film inlined
import re
base = open("../../launch-film-v2/source/video.html").read()
style = re.search(r"<style>.*?</style>", base, re.S).group(0)
open("video.html", "w").write(open("video.tpl.html").read().replace("<!--V2STYLE-->", style))
print("video.html")
