from ansi2html import Ansi2HTMLConverter
from IPython.display import HTML, display

with open("agent.log", "r") as f:
    content = f.read()

conv = Ansi2HTMLConverter()
html = conv.convert(content, full=True)
display(HTML(html))
