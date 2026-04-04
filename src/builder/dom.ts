// Auto-generated file

import { builder } from ".";

export interface Lifecycle {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  attributeChangedCallback?(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void;
  adoptedCallback?(): void; // This one is rarely used, so optional
}

export const a = () =>
  builder(document.createElement("a") as unknown as HTMLAnchorElement);
export const abbr = () =>
  builder(document.createElement("abbr") as unknown as HTMLElement);
export const address = () =>
  builder(document.createElement("address") as unknown as HTMLElement);
export const area = () =>
  builder(document.createElement("area") as unknown as HTMLAreaElement);
export const article = () =>
  builder(document.createElement("article") as unknown as HTMLElement);
export const aside = () =>
  builder(document.createElement("aside") as unknown as HTMLElement);
export const audio = () =>
  builder(document.createElement("audio") as unknown as HTMLAudioElement);
export const b = () =>
  builder(document.createElement("b") as unknown as HTMLElement);
export const base = () =>
  builder(document.createElement("base") as unknown as HTMLBaseElement);
export const bdi = () =>
  builder(document.createElement("bdi") as unknown as HTMLElement);
export const bdo = () =>
  builder(document.createElement("bdo") as unknown as HTMLElement);
export const blockquote = () =>
  builder(document.createElement("blockquote") as unknown as HTMLQuoteElement);
export const body = () =>
  builder(document.createElement("body") as unknown as HTMLBodyElement);
export const br = () =>
  builder(document.createElement("br") as unknown as HTMLBRElement);
export const button = () =>
  builder(document.createElement("button") as unknown as HTMLButtonElement);
export const canvas = () =>
  builder(document.createElement("canvas") as unknown as HTMLCanvasElement);
export const caption = () =>
  builder(
    document.createElement("caption") as unknown as HTMLTableCaptionElement,
  );
export const cite = () =>
  builder(document.createElement("cite") as unknown as HTMLElement);
export const code = () =>
  builder(document.createElement("code") as unknown as HTMLElement);
export const col = () =>
  builder(document.createElement("col") as unknown as HTMLTableColElement);
export const colgroup = () =>
  builder(document.createElement("colgroup") as unknown as HTMLTableColElement);
export const data = () =>
  builder(document.createElement("data") as unknown as HTMLDataElement);
export const datalist = () =>
  builder(document.createElement("datalist") as unknown as HTMLDataListElement);
export const dd = () =>
  builder(document.createElement("dd") as unknown as HTMLElement);
export const del = () =>
  builder(document.createElement("del") as unknown as HTMLModElement);
export const details = () =>
  builder(document.createElement("details") as unknown as HTMLDetailsElement);
export const dfn = () =>
  builder(document.createElement("dfn") as unknown as HTMLElement);
export const dialog = () =>
  builder(document.createElement("dialog") as unknown as HTMLDialogElement);
export const div = () =>
  builder(document.createElement("div") as unknown as HTMLDivElement);
export const dl = () =>
  builder(document.createElement("dl") as unknown as HTMLDListElement);
export const dt = () =>
  builder(document.createElement("dt") as unknown as HTMLElement);
export const em = () =>
  builder(document.createElement("em") as unknown as HTMLElement);
export const embed = () =>
  builder(document.createElement("embed") as unknown as HTMLEmbedElement);
export const fieldset = () =>
  builder(document.createElement("fieldset") as unknown as HTMLFieldSetElement);
export const figcaption = () =>
  builder(document.createElement("figcaption") as unknown as HTMLElement);
export const figure = () =>
  builder(document.createElement("figure") as unknown as HTMLElement);
export const footer = () =>
  builder(document.createElement("footer") as unknown as HTMLElement);
export const form = () =>
  builder(document.createElement("form") as unknown as HTMLFormElement);
export const h1 = () =>
  builder(document.createElement("h1") as unknown as HTMLHeadingElement);
export const h2 = () =>
  builder(document.createElement("h2") as unknown as HTMLHeadingElement);
export const h3 = () =>
  builder(document.createElement("h3") as unknown as HTMLHeadingElement);
export const h4 = () =>
  builder(document.createElement("h4") as unknown as HTMLHeadingElement);
export const h5 = () =>
  builder(document.createElement("h5") as unknown as HTMLHeadingElement);
export const h6 = () =>
  builder(document.createElement("h6") as unknown as HTMLHeadingElement);
export const head = () =>
  builder(document.createElement("head") as unknown as HTMLHeadElement);
export const header = () =>
  builder(document.createElement("header") as unknown as HTMLElement);
export const hgroup = () =>
  builder(document.createElement("hgroup") as unknown as HTMLElement);
export const hr = () =>
  builder(document.createElement("hr") as unknown as HTMLHRElement);
export const html = () =>
  builder(document.createElement("html") as unknown as HTMLHtmlElement);
export const i = () =>
  builder(document.createElement("i") as unknown as HTMLElement);
export const iframe = () =>
  builder(document.createElement("iframe") as unknown as HTMLIFrameElement);
export const img = () =>
  builder(document.createElement("img") as unknown as HTMLImageElement);
export const input = () =>
  builder(document.createElement("input") as unknown as HTMLInputElement);
export const ins = () =>
  builder(document.createElement("ins") as unknown as HTMLModElement);
export const kbd = () =>
  builder(document.createElement("kbd") as unknown as HTMLElement);
export const label = () =>
  builder(document.createElement("label") as unknown as HTMLLabelElement);
export const legend = () =>
  builder(document.createElement("legend") as unknown as HTMLLegendElement);
export const li = () =>
  builder(document.createElement("li") as unknown as HTMLLIElement);
export const link = () =>
  builder(document.createElement("link") as unknown as HTMLLinkElement);
export const main = () =>
  builder(document.createElement("main") as unknown as HTMLElement);
export const map = () =>
  builder(document.createElement("map") as unknown as HTMLMapElement);
export const mark = () =>
  builder(document.createElement("mark") as unknown as HTMLElement);
export const menu = () =>
  builder(document.createElement("menu") as unknown as HTMLMenuElement);
export const meta = () =>
  builder(document.createElement("meta") as unknown as HTMLMetaElement);
export const meter = () =>
  builder(document.createElement("meter") as unknown as HTMLMeterElement);
export const nav = () =>
  builder(document.createElement("nav") as unknown as HTMLElement);
export const noscript = () =>
  builder(document.createElement("noscript") as unknown as HTMLElement);
export const object = () =>
  builder(document.createElement("object") as unknown as HTMLObjectElement);
export const ol = () =>
  builder(document.createElement("ol") as unknown as HTMLOListElement);
export const optgroup = () =>
  builder(document.createElement("optgroup") as unknown as HTMLOptGroupElement);
export const option = () =>
  builder(document.createElement("option") as unknown as HTMLOptionElement);
export const output = () =>
  builder(document.createElement("output") as unknown as HTMLOutputElement);
export const p = () =>
  builder(document.createElement("p") as unknown as HTMLParagraphElement);
export const picture = () =>
  builder(document.createElement("picture") as unknown as HTMLPictureElement);
export const pre = () =>
  builder(document.createElement("pre") as unknown as HTMLPreElement);
export const progress = () =>
  builder(document.createElement("progress") as unknown as HTMLProgressElement);
export const q = () =>
  builder(document.createElement("q") as unknown as HTMLQuoteElement);
export const rp = () =>
  builder(document.createElement("rp") as unknown as HTMLElement);
export const rt = () =>
  builder(document.createElement("rt") as unknown as HTMLElement);
export const ruby = () =>
  builder(document.createElement("ruby") as unknown as HTMLElement);
export const s = () =>
  builder(document.createElement("s") as unknown as HTMLElement);
export const samp = () =>
  builder(document.createElement("samp") as unknown as HTMLElement);
export const script = () =>
  builder(document.createElement("script") as unknown as HTMLScriptElement);
export const search = () =>
  builder(document.createElement("search") as unknown as HTMLElement);
export const section = () =>
  builder(document.createElement("section") as unknown as HTMLElement);
export const select = () =>
  builder(document.createElement("select") as unknown as HTMLSelectElement);
export const slot = () =>
  builder(document.createElement("slot") as unknown as HTMLSlotElement);
export const small = () =>
  builder(document.createElement("small") as unknown as HTMLElement);
export const source = () =>
  builder(document.createElement("source") as unknown as HTMLSourceElement);
export const span = () =>
  builder(document.createElement("span") as unknown as HTMLSpanElement);
export const strong = () =>
  builder(document.createElement("strong") as unknown as HTMLElement);
export const style = () =>
  builder(document.createElement("style") as unknown as HTMLStyleElement);
export const sub = () =>
  builder(document.createElement("sub") as unknown as HTMLElement);
export const summary = () =>
  builder(document.createElement("summary") as unknown as HTMLElement);
export const sup = () =>
  builder(document.createElement("sup") as unknown as HTMLElement);
export const table = () =>
  builder(document.createElement("table") as unknown as HTMLTableElement);
export const tbody = () =>
  builder(
    document.createElement("tbody") as unknown as HTMLTableSectionElement,
  );
export const td = () =>
  builder(document.createElement("td") as unknown as HTMLTableCellElement);
export const template = () =>
  builder(document.createElement("template") as unknown as HTMLTemplateElement);
export const textarea = () =>
  builder(document.createElement("textarea") as unknown as HTMLTextAreaElement);
export const tfoot = () =>
  builder(
    document.createElement("tfoot") as unknown as HTMLTableSectionElement,
  );
export const th = () =>
  builder(document.createElement("th") as unknown as HTMLTableCellElement);
export const thead = () =>
  builder(
    document.createElement("thead") as unknown as HTMLTableSectionElement,
  );
export const time = () =>
  builder(document.createElement("time") as unknown as HTMLTimeElement);
export const title = () =>
  builder(document.createElement("title") as unknown as HTMLTitleElement);
export const tr = () =>
  builder(document.createElement("tr") as unknown as HTMLTableRowElement);
export const track = () =>
  builder(document.createElement("track") as unknown as HTMLTrackElement);
export const u = () =>
  builder(document.createElement("u") as unknown as HTMLElement);
export const ul = () =>
  builder(document.createElement("ul") as unknown as HTMLUListElement);
export const mathVar = () =>
  builder(document.createElement("var") as unknown as HTMLElement);
export const video = () =>
  builder(document.createElement("video") as unknown as HTMLVideoElement);
export const wbr = () =>
  builder(document.createElement("wbr") as unknown as HTMLElement);
export const animate = () =>
  builder(document.createElement("animate") as unknown as SVGAnimateElement);
export const animateMotion = () =>
  builder(
    document.createElement(
      "animateMotion",
    ) as unknown as SVGAnimateMotionElement,
  );
export const animateTransform = () =>
  builder(
    document.createElement(
      "animateTransform",
    ) as unknown as SVGAnimateTransformElement,
  );
export const circle = () =>
  builder(document.createElement("circle") as unknown as SVGCircleElement);
export const clipPath = () =>
  builder(document.createElement("clipPath") as unknown as SVGClipPathElement);
export const defs = () =>
  builder(document.createElement("defs") as unknown as SVGDefsElement);
export const desc = () =>
  builder(document.createElement("desc") as unknown as SVGDescElement);
export const ellipse = () =>
  builder(document.createElement("ellipse") as unknown as SVGEllipseElement);
export const feBlend = () =>
  builder(document.createElement("feBlend") as unknown as SVGFEBlendElement);
export const feColorMatrix = () =>
  builder(
    document.createElement(
      "feColorMatrix",
    ) as unknown as SVGFEColorMatrixElement,
  );
export const feComponentTransfer = () =>
  builder(
    document.createElement(
      "feComponentTransfer",
    ) as unknown as SVGFEComponentTransferElement,
  );
export const feComposite = () =>
  builder(
    document.createElement("feComposite") as unknown as SVGFECompositeElement,
  );
export const feConvolveMatrix = () =>
  builder(
    document.createElement(
      "feConvolveMatrix",
    ) as unknown as SVGFEConvolveMatrixElement,
  );
export const feDiffuseLighting = () =>
  builder(
    document.createElement(
      "feDiffuseLighting",
    ) as unknown as SVGFEDiffuseLightingElement,
  );
export const feDisplacementMap = () =>
  builder(
    document.createElement(
      "feDisplacementMap",
    ) as unknown as SVGFEDisplacementMapElement,
  );
export const feDistantLight = () =>
  builder(
    document.createElement(
      "feDistantLight",
    ) as unknown as SVGFEDistantLightElement,
  );
export const feDropShadow = () =>
  builder(
    document.createElement("feDropShadow") as unknown as SVGFEDropShadowElement,
  );
export const feFlood = () =>
  builder(document.createElement("feFlood") as unknown as SVGFEFloodElement);
export const feFuncA = () =>
  builder(document.createElement("feFuncA") as unknown as SVGFEFuncAElement);
export const feFuncB = () =>
  builder(document.createElement("feFuncB") as unknown as SVGFEFuncBElement);
export const feFuncG = () =>
  builder(document.createElement("feFuncG") as unknown as SVGFEFuncGElement);
export const feFuncR = () =>
  builder(document.createElement("feFuncR") as unknown as SVGFEFuncRElement);
export const feGaussianBlur = () =>
  builder(
    document.createElement(
      "feGaussianBlur",
    ) as unknown as SVGFEGaussianBlurElement,
  );
export const feImage = () =>
  builder(document.createElement("feImage") as unknown as SVGFEImageElement);
export const feMerge = () =>
  builder(document.createElement("feMerge") as unknown as SVGFEMergeElement);
export const feMergeNode = () =>
  builder(
    document.createElement("feMergeNode") as unknown as SVGFEMergeNodeElement,
  );
export const feMorphology = () =>
  builder(
    document.createElement("feMorphology") as unknown as SVGFEMorphologyElement,
  );
export const feOffset = () =>
  builder(document.createElement("feOffset") as unknown as SVGFEOffsetElement);
export const fePointLight = () =>
  builder(
    document.createElement("fePointLight") as unknown as SVGFEPointLightElement,
  );
export const feSpecularLighting = () =>
  builder(
    document.createElement(
      "feSpecularLighting",
    ) as unknown as SVGFESpecularLightingElement,
  );
export const feSpotLight = () =>
  builder(
    document.createElement("feSpotLight") as unknown as SVGFESpotLightElement,
  );
export const feTile = () =>
  builder(document.createElement("feTile") as unknown as SVGFETileElement);
export const feTurbulence = () =>
  builder(
    document.createElement("feTurbulence") as unknown as SVGFETurbulenceElement,
  );
export const filter = () =>
  builder(document.createElement("filter") as unknown as SVGFilterElement);
export const foreignObject = () =>
  builder(
    document.createElement(
      "foreignObject",
    ) as unknown as SVGForeignObjectElement,
  );
export const g = () =>
  builder(document.createElement("g") as unknown as SVGGElement);
export const image = () =>
  builder(document.createElement("image") as unknown as SVGImageElement);
export const line = () =>
  builder(document.createElement("line") as unknown as SVGLineElement);
export const linearGradient = () =>
  builder(
    document.createElement(
      "linearGradient",
    ) as unknown as SVGLinearGradientElement,
  );
export const marker = () =>
  builder(document.createElement("marker") as unknown as SVGMarkerElement);
export const mask = () =>
  builder(document.createElement("mask") as unknown as SVGMaskElement);
export const metadata = () =>
  builder(document.createElement("metadata") as unknown as SVGMetadataElement);
export const mpath = () =>
  builder(document.createElement("mpath") as unknown as SVGMPathElement);
export const path = () =>
  builder(document.createElement("path") as unknown as SVGPathElement);
export const pattern = () =>
  builder(document.createElement("pattern") as unknown as SVGPatternElement);
export const polygon = () =>
  builder(document.createElement("polygon") as unknown as SVGPolygonElement);
export const polyline = () =>
  builder(document.createElement("polyline") as unknown as SVGPolylineElement);
export const radialGradient = () =>
  builder(
    document.createElement(
      "radialGradient",
    ) as unknown as SVGRadialGradientElement,
  );
export const rect = () =>
  builder(document.createElement("rect") as unknown as SVGRectElement);
export const set = () =>
  builder(document.createElement("set") as unknown as SVGSetElement);
export const stop = () =>
  builder(document.createElement("stop") as unknown as SVGStopElement);
export const svg = () =>
  builder(document.createElement("svg") as unknown as SVGSVGElement);
export const svgSwitch = () =>
  builder(document.createElement("switch") as unknown as SVGSwitchElement);
export const symbol = () =>
  builder(document.createElement("symbol") as unknown as SVGSymbolElement);
export const text = () =>
  builder(document.createElement("text") as unknown as SVGTextElement);
export const textPath = () =>
  builder(document.createElement("textPath") as unknown as SVGTextPathElement);
export const tspan = () =>
  builder(document.createElement("tspan") as unknown as SVGTSpanElement);
export const use = () =>
  builder(document.createElement("use") as unknown as SVGUseElement);
export const view = () =>
  builder(document.createElement("view") as unknown as SVGViewElement);
export const annotation = () =>
  builder(document.createElement("annotation") as unknown as MathMLElement);
export const annotationXml = () =>
  builder(document.createElement("annotation-xml") as unknown as MathMLElement);
export const maction = () =>
  builder(document.createElement("maction") as unknown as MathMLElement);
export const math = () =>
  builder(document.createElement("math") as unknown as MathMLElement);
export const merror = () =>
  builder(document.createElement("merror") as unknown as MathMLElement);
export const mfrac = () =>
  builder(document.createElement("mfrac") as unknown as MathMLElement);
export const mi = () =>
  builder(document.createElement("mi") as unknown as MathMLElement);
export const mmultiscripts = () =>
  builder(document.createElement("mmultiscripts") as unknown as MathMLElement);
export const mn = () =>
  builder(document.createElement("mn") as unknown as MathMLElement);
export const mo = () =>
  builder(document.createElement("mo") as unknown as MathMLElement);
export const mover = () =>
  builder(document.createElement("mover") as unknown as MathMLElement);
export const mpadded = () =>
  builder(document.createElement("mpadded") as unknown as MathMLElement);
export const mphantom = () =>
  builder(document.createElement("mphantom") as unknown as MathMLElement);
export const mprescripts = () =>
  builder(document.createElement("mprescripts") as unknown as MathMLElement);
export const mroot = () =>
  builder(document.createElement("mroot") as unknown as MathMLElement);
export const mrow = () =>
  builder(document.createElement("mrow") as unknown as MathMLElement);
export const ms = () =>
  builder(document.createElement("ms") as unknown as MathMLElement);
export const mspace = () =>
  builder(document.createElement("mspace") as unknown as MathMLElement);
export const msqrt = () =>
  builder(document.createElement("msqrt") as unknown as MathMLElement);
export const mstyle = () =>
  builder(document.createElement("mstyle") as unknown as MathMLElement);
export const msub = () =>
  builder(document.createElement("msub") as unknown as MathMLElement);
export const msubsup = () =>
  builder(document.createElement("msubsup") as unknown as MathMLElement);
export const msup = () =>
  builder(document.createElement("msup") as unknown as MathMLElement);
export const mtable = () =>
  builder(document.createElement("mtable") as unknown as MathMLElement);
export const mtd = () =>
  builder(document.createElement("mtd") as unknown as MathMLElement);
export const mtext = () =>
  builder(document.createElement("mtext") as unknown as MathMLElement);
export const mtr = () =>
  builder(document.createElement("mtr") as unknown as MathMLElement);
export const munder = () =>
  builder(document.createElement("munder") as unknown as MathMLElement);
export const munderover = () =>
  builder(document.createElement("munderover") as unknown as MathMLElement);
export const semantics = () =>
  builder(document.createElement("semantics") as unknown as MathMLElement);
