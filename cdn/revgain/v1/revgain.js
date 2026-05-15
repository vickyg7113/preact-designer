class Ne {
  static generateSelector(e) {
    if (e.id)
      return {
        selector: `#${this.escapeSelector(e.id)}`,
        confidence: "high",
        method: "id"
      };
    const i = this.generateContainsSelector(e);
    if (i) return i;
    const r = this.generatePathFromAnchorToElement(e);
    if (r) return r;
    if (e.hasAttribute("data-testid")) {
      const a = e.getAttribute("data-testid");
      return {
        selector: `[data-testid="${this.escapeAttribute(a)}"]`,
        confidence: "high",
        method: "data-testid"
      };
    }
    const o = this.getSemanticDataAttributes(e);
    if (o.length > 0) {
      const a = o[0], u = e.getAttribute(a);
      return {
        selector: `[${a}="${this.escapeAttribute(u)}"]`,
        confidence: "high",
        method: "data-attribute"
      };
    }
    const s = this.generateAriaSelector(e);
    if (s)
      return { selector: s, confidence: "medium", method: "aria" };
    const l = this.generatePathSelector(e);
    return l ? { selector: l, confidence: "medium", method: "path" } : {
      selector: e.tagName.toLowerCase(),
      confidence: "low",
      method: "tag"
    };
  }
  /** Generate absolute XPath for an element (e.g. /html[1]/body[1]/div[1]/...) */
  static getXPath(e) {
    if (e.id && document.querySelector(`#${CSS.escape(e.id)}`) === e)
      return `//*[@id="${e.id.replace(/"/g, '\\"')}"]`;
    const i = [];
    let r = e;
    for (; r && r !== document.documentElement; ) {
      const l = r.tagName.toLowerCase(), a = r.parentElement;
      if (!a) {
        i.unshift(l);
        break;
      }
      const d = Array.from(a.children).filter((h) => h.tagName === r.tagName).indexOf(r) + 1;
      i.unshift(`${l}[${d}]`), r = a;
    }
    const o = i.join("/");
    let s = o ? `/${o}` : "";
    return s.startsWith("/html") || (s = "/html[1]" + (s.startsWith("/") ? s : "/" + s)), s;
  }
  static findElement(e) {
    try {
      if (e.startsWith("/") || e.startsWith("//"))
        return this.findElementByXPath(e);
      const i = this.parseContainsAndDescendant(e);
      if (i) {
        const o = this.findElementWithContains(i.anchorPart);
        if (!o) return null;
        if (i.descendantPart) {
          const s = o.querySelector(i.descendantPart);
          return s || null;
        }
        return o;
      }
      return e.match(/(.*):contains\('((?:[^'\\]|\\.)*)'\)$/) ? this.findElementWithContains(e) : document.querySelector(e);
    } catch {
      return null;
    }
  }
  /** "anchorPart:contains('x') > descendantPart" -> { anchorPart, descendantPart } */
  static parseContainsAndDescendant(e) {
    const i = e.match(/:contains\('((?:[^'\\]|\\.)*)'\)/);
    if (!i) return null;
    const r = e.indexOf(i[0]) + i[0].length, o = e.slice(r), s = o.indexOf(" > ");
    return s === -1 ? null : {
      anchorPart: e.slice(0, r + s).trim(),
      descendantPart: o.slice(s + 3).trim() || null
    };
  }
  static findElementByXPath(e) {
    try {
      let i = e;
      return i.startsWith("/body") && (i = "/html[1]" + i), document.evaluate(i, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch {
      return null;
    }
  }
  static findElementWithContains(e) {
    const i = e.match(/(.*):contains\('((?:[^'\\]|\\.)*)'\)$/);
    if (!i) return null;
    const r = i[1].trim(), o = i[2].replace(/\\'/g, "'"), s = this.normalizeText(o), l = document.querySelectorAll(r);
    for (let a = 0; a < l.length; a++)
      if (this.normalizeText(l[a].textContent || "").includes(s)) return l[a];
    return null;
  }
  static validateSelector(e) {
    try {
      return this.findElement(e) !== null;
    } catch {
      return !1;
    }
  }
  /**
   * Waits for an element to appear in the DOM using MutationObserver.
   * Leverages findElement for consistent behavior with XPaths/Selectors.
   */
  static waitForElement(e, i = 5e3) {
    return new Promise((r, o) => {
      const s = this.findElement(e);
      if (s) return r(s);
      const l = new MutationObserver(() => {
        const a = this.findElement(e);
        a && (l.disconnect(), r(a));
      });
      l.observe(document.body, {
        childList: !0
      }), setTimeout(() => {
        l.disconnect(), o(new Error(`Element not found: ${e}`));
      }, i);
    });
  }
  static getSemanticDataAttributes(e) {
    const i = ["data-id", "data-name", "data-role", "data-component", "data-element"], r = [];
    for (const o of i)
      e.hasAttribute(o) && r.push(o);
    for (let o = 0; o < e.attributes.length; o++) {
      const s = e.attributes[o];
      s.name.startsWith("data-") && !r.includes(s.name) && r.push(s.name);
    }
    return r;
  }
  static generateAriaSelector(e) {
    const i = e.getAttribute("role"), r = e.getAttribute("aria-label");
    if (i) {
      let o = `[role="${this.escapeAttribute(i)}"]`;
      return r && (o += `[aria-label="${this.escapeAttribute(r)}"]`), o;
    }
    return null;
  }
  static generatePathSelector(e) {
    const i = [];
    let r = e;
    for (; r && r !== document.body && r !== document.documentElement; ) {
      let o = r.tagName.toLowerCase();
      if (r.id) {
        o += `#${this.escapeSelector(r.id)}`, i.unshift(o);
        break;
      }
      if (r.className && typeof r.className == "string") {
        const l = r.className.split(/\s+/).filter((a) => a && !a.startsWith("designer-")).slice(0, 2);
        l.length > 0 && (o += "." + l.map((a) => this.escapeSelector(a)).join("."));
      }
      const s = r.parentElement;
      if (s) {
        const l = Array.from(s.children).filter(
          (a) => a.tagName === r.tagName
        );
        l.length > 1 && (o += `:nth-of-type(${l.indexOf(r) + 1})`);
      }
      if (i.unshift(o), r = s, i.length >= 5) break;
    }
    return i.length > 0 ? i.join(" > ") : null;
  }
  static normalizeText(e) {
    return (e || "").trim().replace(/\s+/g, " ");
  }
  /** Single segment: tag + classes + nth-of-type (no id) */
  static buildSegment(e) {
    let i = e.tagName.toLowerCase();
    if (e.className && typeof e.className == "string") {
      const o = e.className.split(/\s+/).filter((s) => s && !s.startsWith("designer-")).slice(0, 2);
      o.length > 0 && (i += "." + o.map((s) => this.escapeSelector(s)).join("."));
    }
    const r = e.parentElement;
    if (r) {
      const o = Array.from(r.children).filter((s) => s.tagName === e.tagName);
      o.length > 1 && (i += `:nth-of-type(${o.indexOf(e) + 1})`);
    }
    return i;
  }
  /** Path from ancestor down to element (inclusive): [ancestor, ..., element] */
  static getPathFromAncestorToElement(e, i) {
    const r = [];
    let o = i;
    for (; o && o !== e; )
      r.unshift(o), o = o.parentElement;
    return o === e && r.unshift(e), r;
  }
  /** Contains selector when element has meaningful text: path + :contains('text') */
  static generateContainsSelector(e) {
    const r = (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
    if (r.length < 2) return null;
    const o = this.generatePathSelector(e);
    if (!o) return null;
    const s = r.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return {
      selector: `${o}:contains('${s}')`,
      confidence: "high",
      method: "contains"
    };
  }
  /**
   * Find first ancestor (step by step) that has id or meaningful text.
   * Used when the selected element (e.g. icon) has no id and no text.
   */
  static findAnchor(e) {
    let i = e.parentElement;
    for (; i && i !== document.body && i !== document.documentElement; ) {
      if (i.id) return { anchor: i, hasId: !0 };
      if ((i.textContent || "").trim().replace(/\s+/g, " ").length >= 2) return { anchor: i, hasId: !1 };
      i = i.parentElement;
    }
    return null;
  }
  /**
   * When element has no id and no text (e.g. icon): traverse to parent with id or text,
   * then return selector = entire path from that anchor to the selected element.
   */
  static generatePathFromAnchorToElement(e) {
    const i = this.findAnchor(e);
    if (!i) return null;
    const { anchor: r, hasId: o } = i, s = this.getPathFromAncestorToElement(r, e);
    if (s.length < 2 || s.length > 12) return null;
    const a = [];
    if (o) {
      a.push(`#${this.escapeSelector(r.id)}`);
      for (let u = 1; u < s.length; u++) a.push(this.buildSegment(s[u]));
    } else {
      const u = (r.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (u.length < 2) return null;
      const d = this.generatePathSelector(r);
      if (!d) return null;
      const h = u.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      a.push(`${d}:contains('${h}')`);
      for (let c = 1; c < s.length; c++) a.push(this.buildSegment(s[c]));
    }
    return {
      selector: a.join(" > "),
      confidence: "high",
      method: "path-from-anchor"
    };
  }
  static escapeSelector(e) {
    return typeof CSS < "u" && CSS.escape ? CSS.escape(e) : e.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }
  static escapeAttribute(e) {
    return e.replace(/"/g, '\\"').replace(/'/g, "\\'");
  }
}
function Lt(t) {
  return t ? Array.isArray(t) ? t : String(t).replace(/[{}]/g, "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) : [];
}
function lr(t) {
  const e = t.getBoundingClientRect(), i = {};
  for (let r = 0; r < t.attributes.length; r++) {
    const o = t.attributes[r];
    i[o.name] = o.value;
  }
  return {
    tagName: t.tagName.toLowerCase(),
    id: t.id || void 0,
    className: t.className?.toString() || void 0,
    textContent: t.textContent?.trim().substring(0, 50) || void 0,
    attributes: i,
    boundingRect: e
  };
}
function Oi(t) {
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0" && t.getBoundingClientRect().height > 0 && t.getBoundingClientRect().width > 0;
}
function je() {
  return window.location.pathname || "/";
}
function Ai() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function cr(t) {
  const e = t.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function qt(t) {
  cr(t) || t.scrollIntoView({ behavior: "smooth", block: "center" });
}
function Re(t) {
  return t.content && t.content.trim() !== "" ? t.content : t.template?.content || "";
}
const Pi = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class dr {
  isActive = !1;
  highlightOverlay = null;
  messageCallback = null;
  activate(e) {
    this.isActive || (this.isActive = !0, this.messageCallback = e, this.createHighlightOverlay(), this.attachEventListeners(), this.addEditorStyles());
  }
  deactivate() {
    this.isActive && (this.isActive = !1, this.removeEventListeners(), this.removeHighlightOverlay(), this.removeEditorStyles(), this.messageCallback = null);
  }
  getActive() {
    return this.isActive;
  }
  createHighlightOverlay() {
    if (!document.body) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.createHighlightOverlay());
        return;
      }
      setTimeout(() => this.createHighlightOverlay(), 100);
      return;
    }
    this.highlightOverlay = document.createElement("div"), this.highlightOverlay.id = "designer-highlight-overlay", this.highlightOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background-color: rgba(59, 130, 246, 0.1);
      z-index: 999998;
      transition: all 0.1s ease;
      box-sizing: border-box;
      display: none;
    `, document.body.appendChild(this.highlightOverlay);
  }
  removeHighlightOverlay() {
    this.highlightOverlay?.remove(), this.highlightOverlay = null;
  }
  attachEventListeners() {
    document.addEventListener("mouseover", this.handleMouseOver, !0), document.addEventListener("click", this.handleClick, !0), document.addEventListener("keydown", this.handleKeyDown, !0);
  }
  removeEventListeners() {
    document.removeEventListener("mouseover", this.handleMouseOver, !0), document.removeEventListener("click", this.handleClick, !0), document.removeEventListener("keydown", this.handleKeyDown, !0);
  }
  handleMouseOver = (e) => {
    if (!this.isActive || !this.highlightOverlay) return;
    const i = e.target;
    if (!(!i || i === this.highlightOverlay)) {
      if (i.closest(Pi)) {
        this.hideHighlight();
        return;
      }
      if (!Oi(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (e) => {
    if (!this.isActive) return;
    const i = e.target;
    i && (i.closest(Pi) || (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), Oi(i) && this.selectElement(i)));
  };
  handleKeyDown = (e) => {
    this.isActive && e.key === "Escape" && (this.messageCallback?.({ type: "CANCEL" }), this.hideHighlight());
  };
  highlightElement(e) {
    if (!this.highlightOverlay) return;
    const i = e.getBoundingClientRect(), r = window.pageXOffset || document.documentElement.scrollLeft, o = window.pageYOffset || document.documentElement.scrollTop;
    this.highlightOverlay.style.display = "block", this.highlightOverlay.style.left = `${i.left + r}px`, this.highlightOverlay.style.top = `${i.top + o}px`, this.highlightOverlay.style.width = `${i.width}px`, this.highlightOverlay.style.height = `${i.height}px`;
  }
  hideHighlight() {
    this.highlightOverlay && (this.highlightOverlay.style.display = "none");
  }
  selectElement(e) {
    this.highlightElement(e);
    const i = Ne.generateSelector(e), r = lr(e), o = Ne.getXPath(e);
    this.messageCallback?.({
      type: "ELEMENT_SELECTED",
      selector: i.selector,
      elementInfo: r,
      xpath: o
    });
  }
  addEditorStyles() {
    const e = document.createElement("style");
    e.id = "designer-editor-styles", e.textContent = `
      * { user-select: none !important; -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; }
      a, button, input, textarea, select { pointer-events: auto !important; }
    `, document.head.appendChild(e);
  }
  removeEditorStyles() {
    document.getElementById("designer-editor-styles")?.remove();
  }
}
var Gt, B, xn, et, Fi, Sn, wn, Cn, mi, ti, ii, En, gt = {}, kn = [], ur = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, bt = Array.isArray;
function Be(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function gi(t) {
  t && t.parentNode && t.parentNode.removeChild(t);
}
function ni(t, e, i) {
  var r, o, s, l = {};
  for (s in e) s == "key" ? r = e[s] : s == "ref" ? o = e[s] : l[s] = e[s];
  if (arguments.length > 2 && (l.children = arguments.length > 3 ? Gt.call(arguments, 2) : i), typeof t == "function" && t.defaultProps != null) for (s in t.defaultProps) l[s] === void 0 && (l[s] = t.defaultProps[s]);
  return zt(t, l, r, o, null);
}
function zt(t, e, i, r, o) {
  var s = { type: t, props: e, key: i, ref: r, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: o ?? ++xn, __i: -1, __u: 0 };
  return o == null && B.vnode != null && B.vnode(s), s;
}
function ee(t) {
  return t.children;
}
function We(t, e) {
  this.props = t, this.context = e;
}
function st(t, e) {
  if (e == null) return t.__ ? st(t.__, t.__i + 1) : null;
  for (var i; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) return i.__e;
  return typeof t.type == "function" ? st(t) : null;
}
function In(t) {
  var e, i;
  if ((t = t.__) != null && t.__c != null) {
    for (t.__e = t.__c.base = null, e = 0; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) {
      t.__e = t.__c.base = i.__e;
      break;
    }
    return In(t);
  }
}
function ri(t) {
  (!t.__d && (t.__d = !0) && et.push(t) && !Mt.__r++ || Fi != B.debounceRendering) && ((Fi = B.debounceRendering) || Sn)(Mt);
}
function Mt() {
  for (var t, e, i, r, o, s, l, a = 1; et.length; ) et.length > a && et.sort(wn), t = et.shift(), a = et.length, t.__d && (i = void 0, r = void 0, o = (r = (e = t).__v).__e, s = [], l = [], e.__P && ((i = Be({}, r)).__v = r.__v + 1, B.vnode && B.vnode(i), yi(e.__P, i, r, e.__n, e.__P.namespaceURI, 32 & r.__u ? [o] : null, s, o ?? st(r), !!(32 & r.__u), l), i.__v = r.__v, i.__.__k[i.__i] = i, On(s, i, l), r.__e = r.__ = null, i.__e != o && In(i)));
  Mt.__r = 0;
}
function Tn(t, e, i, r, o, s, l, a, u, d, h) {
  var c, p, m, _, x, I, k, E = r && r.__k || kn, v = e.length;
  for (u = hr(i, e, E, u, v), c = 0; c < v; c++) (m = i.__k[c]) != null && (p = m.__i == -1 ? gt : E[m.__i] || gt, m.__i = c, I = yi(t, m, p, o, s, l, a, u, d, h), _ = m.__e, m.ref && p.ref != m.ref && (p.ref && _i(p.ref, null, m), h.push(m.ref, m.__c || _, m)), x == null && _ != null && (x = _), (k = !!(4 & m.__u)) || p.__k === m.__k ? u = Rn(m, u, t, k) : typeof m.type == "function" && I !== void 0 ? u = I : _ && (u = _.nextSibling), m.__u &= -7);
  return i.__e = x, u;
}
function hr(t, e, i, r, o) {
  var s, l, a, u, d, h = i.length, c = h, p = 0;
  for (t.__k = new Array(o), s = 0; s < o; s++) (l = e[s]) != null && typeof l != "boolean" && typeof l != "function" ? (typeof l == "string" || typeof l == "number" || typeof l == "bigint" || l.constructor == String ? l = t.__k[s] = zt(null, l, null, null, null) : bt(l) ? l = t.__k[s] = zt(ee, { children: l }, null, null, null) : l.constructor === void 0 && l.__b > 0 ? l = t.__k[s] = zt(l.type, l.props, l.key, l.ref ? l.ref : null, l.__v) : t.__k[s] = l, u = s + p, l.__ = t, l.__b = t.__b + 1, a = null, (d = l.__i = pr(l, i, u, c)) != -1 && (c--, (a = i[d]) && (a.__u |= 2)), a == null || a.__v == null ? (d == -1 && (o > h ? p-- : o < h && p++), typeof l.type != "function" && (l.__u |= 4)) : d != u && (d == u - 1 ? p-- : d == u + 1 ? p++ : (d > u ? p-- : p++, l.__u |= 4))) : t.__k[s] = null;
  if (c) for (s = 0; s < h; s++) (a = i[s]) != null && (2 & a.__u) == 0 && (a.__e == r && (r = st(a)), Pn(a, a));
  return r;
}
function Rn(t, e, i, r) {
  var o, s;
  if (typeof t.type == "function") {
    for (o = t.__k, s = 0; o && s < o.length; s++) o[s] && (o[s].__ = t, e = Rn(o[s], e, i, r));
    return e;
  }
  t.__e != e && (r && (e && t.type && !e.parentNode && (e = st(t)), i.insertBefore(t.__e, e || null)), e = t.__e);
  do
    e = e && e.nextSibling;
  while (e != null && e.nodeType == 8);
  return e;
}
function Ut(t, e) {
  return e = e || [], t == null || typeof t == "boolean" || (bt(t) ? t.some(function(i) {
    Ut(i, e);
  }) : e.push(t)), e;
}
function pr(t, e, i, r) {
  var o, s, l, a = t.key, u = t.type, d = e[i], h = d != null && (2 & d.__u) == 0;
  if (d === null && a == null || h && a == d.key && u == d.type) return i;
  if (r > (h ? 1 : 0)) {
    for (o = i - 1, s = i + 1; o >= 0 || s < e.length; ) if ((d = e[l = o >= 0 ? o-- : s++]) != null && (2 & d.__u) == 0 && a == d.key && u == d.type) return l;
  }
  return -1;
}
function Li(t, e, i) {
  e[0] == "-" ? t.setProperty(e, i ?? "") : t[e] = i == null ? "" : typeof i != "number" || ur.test(e) ? i : i + "px";
}
function wt(t, e, i, r, o) {
  var s, l;
  e: if (e == "style") if (typeof i == "string") t.style.cssText = i;
  else {
    if (typeof r == "string" && (t.style.cssText = r = ""), r) for (e in r) i && e in i || Li(t.style, e, "");
    if (i) for (e in i) r && i[e] == r[e] || Li(t.style, e, i[e]);
  }
  else if (e[0] == "o" && e[1] == "n") s = e != (e = e.replace(Cn, "$1")), l = e.toLowerCase(), e = l in t || e == "onFocusOut" || e == "onFocusIn" ? l.slice(2) : e.slice(2), t.l || (t.l = {}), t.l[e + s] = i, i ? r ? i.u = r.u : (i.u = mi, t.addEventListener(e, s ? ii : ti, s)) : t.removeEventListener(e, s ? ii : ti, s);
  else {
    if (o == "http://www.w3.org/2000/svg") e = e.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if (e != "width" && e != "height" && e != "href" && e != "list" && e != "form" && e != "tabIndex" && e != "download" && e != "rowSpan" && e != "colSpan" && e != "role" && e != "popover" && e in t) try {
      t[e] = i ?? "";
      break e;
    } catch {
    }
    typeof i == "function" || (i == null || i === !1 && e[4] != "-" ? t.removeAttribute(e) : t.setAttribute(e, e == "popover" && i == 1 ? "" : i));
  }
}
function zi(t) {
  return function(e) {
    if (this.l) {
      var i = this.l[e.type + t];
      if (e.t == null) e.t = mi++;
      else if (e.t < i.u) return;
      return i(B.event ? B.event(e) : e);
    }
  };
}
function yi(t, e, i, r, o, s, l, a, u, d) {
  var h, c, p, m, _, x, I, k, E, v, S, T, F, P, U, q, Z, N = e.type;
  if (e.constructor !== void 0) return null;
  128 & i.__u && (u = !!(32 & i.__u), s = [a = e.__e = i.__e]), (h = B.__b) && h(e);
  e: if (typeof N == "function") try {
    if (k = e.props, E = "prototype" in N && N.prototype.render, v = (h = N.contextType) && r[h.__c], S = h ? v ? v.props.value : h.__ : r, i.__c ? I = (c = e.__c = i.__c).__ = c.__E : (E ? e.__c = c = new N(k, S) : (e.__c = c = new We(k, S), c.constructor = N, c.render = mr), v && v.sub(c), c.state || (c.state = {}), c.__n = r, p = c.__d = !0, c.__h = [], c._sb = []), E && c.__s == null && (c.__s = c.state), E && N.getDerivedStateFromProps != null && (c.__s == c.state && (c.__s = Be({}, c.__s)), Be(c.__s, N.getDerivedStateFromProps(k, c.__s))), m = c.props, _ = c.state, c.__v = e, p) E && N.getDerivedStateFromProps == null && c.componentWillMount != null && c.componentWillMount(), E && c.componentDidMount != null && c.__h.push(c.componentDidMount);
    else {
      if (E && N.getDerivedStateFromProps == null && k !== m && c.componentWillReceiveProps != null && c.componentWillReceiveProps(k, S), e.__v == i.__v || !c.__e && c.shouldComponentUpdate != null && c.shouldComponentUpdate(k, c.__s, S) === !1) {
        for (e.__v != i.__v && (c.props = k, c.state = c.__s, c.__d = !1), e.__e = i.__e, e.__k = i.__k, e.__k.some(function(Q) {
          Q && (Q.__ = e);
        }), T = 0; T < c._sb.length; T++) c.__h.push(c._sb[T]);
        c._sb = [], c.__h.length && l.push(c);
        break e;
      }
      c.componentWillUpdate != null && c.componentWillUpdate(k, c.__s, S), E && c.componentDidUpdate != null && c.__h.push(function() {
        c.componentDidUpdate(m, _, x);
      });
    }
    if (c.context = S, c.props = k, c.__P = t, c.__e = !1, F = B.__r, P = 0, E) {
      for (c.state = c.__s, c.__d = !1, F && F(e), h = c.render(c.props, c.state, c.context), U = 0; U < c._sb.length; U++) c.__h.push(c._sb[U]);
      c._sb = [];
    } else do
      c.__d = !1, F && F(e), h = c.render(c.props, c.state, c.context), c.state = c.__s;
    while (c.__d && ++P < 25);
    c.state = c.__s, c.getChildContext != null && (r = Be(Be({}, r), c.getChildContext())), E && !p && c.getSnapshotBeforeUpdate != null && (x = c.getSnapshotBeforeUpdate(m, _)), q = h, h != null && h.type === ee && h.key == null && (q = An(h.props.children)), a = Tn(t, bt(q) ? q : [q], e, i, r, o, s, l, a, u, d), c.base = e.__e, e.__u &= -161, c.__h.length && l.push(c), I && (c.__E = c.__ = null);
  } catch (Q) {
    if (e.__v = null, u || s != null) if (Q.then) {
      for (e.__u |= u ? 160 : 128; a && a.nodeType == 8 && a.nextSibling; ) a = a.nextSibling;
      s[s.indexOf(a)] = null, e.__e = a;
    } else {
      for (Z = s.length; Z--; ) gi(s[Z]);
      oi(e);
    }
    else e.__e = i.__e, e.__k = i.__k, Q.then || oi(e);
    B.__e(Q, e, i);
  }
  else s == null && e.__v == i.__v ? (e.__k = i.__k, e.__e = i.__e) : a = e.__e = fr(i.__e, e, i, r, o, s, l, u, d);
  return (h = B.diffed) && h(e), 128 & e.__u ? void 0 : a;
}
function oi(t) {
  t && t.__c && (t.__c.__e = !0), t && t.__k && t.__k.forEach(oi);
}
function On(t, e, i) {
  for (var r = 0; r < i.length; r++) _i(i[r], i[++r], i[++r]);
  B.__c && B.__c(e, t), t.some(function(o) {
    try {
      t = o.__h, o.__h = [], t.some(function(s) {
        s.call(o);
      });
    } catch (s) {
      B.__e(s, o.__v);
    }
  });
}
function An(t) {
  return typeof t != "object" || t == null || t.__b && t.__b > 0 ? t : bt(t) ? t.map(An) : Be({}, t);
}
function fr(t, e, i, r, o, s, l, a, u) {
  var d, h, c, p, m, _, x, I = i.props || gt, k = e.props, E = e.type;
  if (E == "svg" ? o = "http://www.w3.org/2000/svg" : E == "math" ? o = "http://www.w3.org/1998/Math/MathML" : o || (o = "http://www.w3.org/1999/xhtml"), s != null) {
    for (d = 0; d < s.length; d++) if ((m = s[d]) && "setAttribute" in m == !!E && (E ? m.localName == E : m.nodeType == 3)) {
      t = m, s[d] = null;
      break;
    }
  }
  if (t == null) {
    if (E == null) return document.createTextNode(k);
    t = document.createElementNS(o, E, k.is && k), a && (B.__m && B.__m(e, s), a = !1), s = null;
  }
  if (E == null) I === k || a && t.data == k || (t.data = k);
  else {
    if (s = s && Gt.call(t.childNodes), !a && s != null) for (I = {}, d = 0; d < t.attributes.length; d++) I[(m = t.attributes[d]).name] = m.value;
    for (d in I) if (m = I[d], d != "children") {
      if (d == "dangerouslySetInnerHTML") c = m;
      else if (!(d in k)) {
        if (d == "value" && "defaultValue" in k || d == "checked" && "defaultChecked" in k) continue;
        wt(t, d, null, m, o);
      }
    }
    for (d in k) m = k[d], d == "children" ? p = m : d == "dangerouslySetInnerHTML" ? h = m : d == "value" ? _ = m : d == "checked" ? x = m : a && typeof m != "function" || I[d] === m || wt(t, d, m, I[d], o);
    if (h) a || c && (h.__html == c.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), e.__k = [];
    else if (c && (t.innerHTML = ""), Tn(e.type == "template" ? t.content : t, bt(p) ? p : [p], e, i, r, E == "foreignObject" ? "http://www.w3.org/1999/xhtml" : o, s, l, s ? s[0] : i.__k && st(i, 0), a, u), s != null) for (d = s.length; d--; ) gi(s[d]);
    a || (d = "value", E == "progress" && _ == null ? t.removeAttribute("value") : _ != null && (_ !== t[d] || E == "progress" && !_ || E == "option" && _ != I[d]) && wt(t, d, _, I[d], o), d = "checked", x != null && x != t[d] && wt(t, d, x, I[d], o));
  }
  return t;
}
function _i(t, e, i) {
  try {
    if (typeof t == "function") {
      var r = typeof t.__u == "function";
      r && t.__u(), r && e == null || (t.__u = t(e));
    } else t.current = e;
  } catch (o) {
    B.__e(o, i);
  }
}
function Pn(t, e, i) {
  var r, o;
  if (B.unmount && B.unmount(t), (r = t.ref) && (r.current && r.current != t.__e || _i(r, null, e)), (r = t.__c) != null) {
    if (r.componentWillUnmount) try {
      r.componentWillUnmount();
    } catch (s) {
      B.__e(s, e);
    }
    r.base = r.__P = null;
  }
  if (r = t.__k) for (o = 0; o < r.length; o++) r[o] && Pn(r[o], e, i || typeof t.type != "function");
  i || gi(t.__e), t.__c = t.__ = t.__e = void 0;
}
function mr(t, e, i) {
  return this.constructor(t, i);
}
function Qe(t, e, i) {
  var r, o, s, l;
  e == document && (e = document.documentElement), B.__ && B.__(t, e), o = (r = !1) ? null : e.__k, s = [], l = [], yi(e, t = e.__k = ni(ee, null, [t]), o || gt, gt, e.namespaceURI, o ? null : e.firstChild ? Gt.call(e.childNodes) : null, s, o ? o.__e : e.firstChild, r, l), On(s, t, l);
}
function bi(t) {
  function e(i) {
    var r, o;
    return this.getChildContext || (r = /* @__PURE__ */ new Set(), (o = {})[e.__c] = this, this.getChildContext = function() {
      return o;
    }, this.componentWillUnmount = function() {
      r = null;
    }, this.shouldComponentUpdate = function(s) {
      this.props.value != s.value && r.forEach(function(l) {
        l.__e = !0, ri(l);
      });
    }, this.sub = function(s) {
      r.add(s);
      var l = s.componentWillUnmount;
      s.componentWillUnmount = function() {
        r && r.delete(s), l && l.call(s);
      };
    }), i.children;
  }
  return e.__c = "__cC" + En++, e.__ = t, e.Provider = e.__l = (e.Consumer = function(i, r) {
    return i.children(r);
  }).contextType = e, e;
}
Gt = kn.slice, B = { __e: function(t, e, i, r) {
  for (var o, s, l; e = e.__; ) if ((o = e.__c) && !o.__) try {
    if ((s = o.constructor) && s.getDerivedStateFromError != null && (o.setState(s.getDerivedStateFromError(t)), l = o.__d), o.componentDidCatch != null && (o.componentDidCatch(t, r || {}), l = o.__d), l) return o.__E = o;
  } catch (a) {
    t = a;
  }
  throw t;
} }, xn = 0, We.prototype.setState = function(t, e) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = Be({}, this.state), typeof t == "function" && (t = t(Be({}, i), this.props)), t && Be(i, t), t != null && this.__v && (e && this._sb.push(e), ri(this));
}, We.prototype.forceUpdate = function(t) {
  this.__v && (this.__e = !0, t && this.__h.push(t), ri(this));
}, We.prototype.render = ee, et = [], Sn = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, wn = function(t, e) {
  return t.__v.__b - e.__v.__b;
}, Mt.__r = 0, Cn = /(PointerCapture)$|Capture$/i, mi = 0, ti = zi(!1), ii = zi(!0), En = 0;
var gr = 0;
function n(t, e, i, r, o, s) {
  e || (e = {});
  var l, a, u = e;
  if ("ref" in u) for (a in u = {}, e) a == "ref" ? l = e[a] : u[a] = e[a];
  var d = { type: t, props: u, key: i, ref: l, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --gr, __i: -1, __u: 0, __source: o, __self: s };
  if (typeof t == "function" && (l = t.defaultProps)) for (a in l) u[a] === void 0 && (u[a] = l[a]);
  return B.vnode && B.vnode(d), d;
}
const y = {
  fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
  primary: "#3b82f6",
  border: "#e2e8f0",
  text: "#111827",
  textMuted: "#64748b",
  bg: "#ffffff",
  shadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  shadowHover: "0 6px 16px rgba(0, 0, 0, 0.2)",
  borderRadius: "8px",
  zIndex: {
    overlay: 2147483640,
    guides: 2147483641,
    tooltip: 2147483642,
    highlight: 2147483643,
    editor: 2147483644,
    controls: 2147483645,
    badge: 2147483646,
    loading: 2147483647
    // Max safe 32-bit signed int
  }
};
function yr({ guide: t, top: e, left: i, arrowStyle: r, onDismiss: o }) {
  return /* @__PURE__ */ n(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": t.id,
      style: {
        position: "absolute",
        background: y.bg,
        border: `2px solid ${y.primary}`,
        borderRadius: y.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: y.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: y.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: y.text,
        top: `${e}px`,
        left: `${i}px`,
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ n("div", { style: { marginBottom: 8 }, children: t.content }),
        /* @__PURE__ */ n(
          "button",
          {
            type: "button",
            onClick: o,
            style: {
              background: y.primary,
              color: y.bg,
              border: "none",
              borderRadius: 4,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s"
            },
            children: "Got it"
          }
        ),
        /* @__PURE__ */ n(
          "div",
          {
            className: "designer-guide-arrow",
            style: {
              position: "absolute",
              width: 0,
              height: 0,
              borderStyle: "solid",
              ...r
            }
          }
        )
      ]
    }
  );
}
var it, ne, Vt, Di, yt = 0, Fn = [], le = B, Ni = le.__b, Mi = le.__r, Ui = le.diffed, Bi = le.__c, Wi = le.unmount, Gi = le.__;
function vt(t, e) {
  le.__h && le.__h(ne, t, yt || e), yt = 0;
  var i = ne.__H || (ne.__H = { __: [], __h: [] });
  return t >= i.__.length && i.__.push({}), i.__[t];
}
function b(t) {
  return yt = 1, _r(Ln, t);
}
function _r(t, e, i) {
  var r = vt(it++, 2);
  if (r.t = t, !r.__c && (r.__ = [i ? i(e) : Ln(void 0, e), function(a) {
    var u = r.__N ? r.__N[0] : r.__[0], d = r.t(u, a);
    u !== d && (r.__N = [d, r.__[1]], r.__c.setState({}));
  }], r.__c = ne, !ne.__f)) {
    var o = function(a, u, d) {
      if (!r.__c.__H) return !0;
      var h = r.__c.__H.__.filter(function(p) {
        return !!p.__c;
      });
      if (h.every(function(p) {
        return !p.__N;
      })) return !s || s.call(this, a, u, d);
      var c = r.__c.props !== a;
      return h.forEach(function(p) {
        if (p.__N) {
          var m = p.__[0];
          p.__ = p.__N, p.__N = void 0, m !== p.__[0] && (c = !0);
        }
      }), s && s.call(this, a, u, d) || c;
    };
    ne.__f = !0;
    var s = ne.shouldComponentUpdate, l = ne.componentWillUpdate;
    ne.componentWillUpdate = function(a, u, d) {
      if (this.__e) {
        var h = s;
        s = void 0, o(a, u, d), s = h;
      }
      l && l.call(this, a, u, d);
    }, ne.shouldComponentUpdate = o;
  }
  return r.__N || r.__;
}
function pe(t, e) {
  var i = vt(it++, 3);
  !le.__s && xi(i.__H, e) && (i.__ = t, i.u = e, ne.__H.__h.push(i));
}
function br(t, e) {
  var i = vt(it++, 4);
  !le.__s && xi(i.__H, e) && (i.__ = t, i.u = e, ne.__h.push(i));
}
function vr(t) {
  return yt = 5, Me(function() {
    return { current: t };
  }, []);
}
function Me(t, e) {
  var i = vt(it++, 7);
  return xi(i.__H, e) && (i.__ = t(), i.__H = e, i.__h = t), i.__;
}
function De(t, e) {
  return yt = 8, Me(function() {
    return t;
  }, e);
}
function vi(t) {
  var e = ne.context[t.__c], i = vt(it++, 9);
  return i.c = t, e ? (i.__ == null && (i.__ = !0, e.sub(ne)), e.props.value) : t.__;
}
function xr() {
  for (var t; t = Fn.shift(); ) if (t.__P && t.__H) try {
    t.__H.__h.forEach(Dt), t.__H.__h.forEach(si), t.__H.__h = [];
  } catch (e) {
    t.__H.__h = [], le.__e(e, t.__v);
  }
}
le.__b = function(t) {
  ne = null, Ni && Ni(t);
}, le.__ = function(t, e) {
  t && e.__k && e.__k.__m && (t.__m = e.__k.__m), Gi && Gi(t, e);
}, le.__r = function(t) {
  Mi && Mi(t), it = 0;
  var e = (ne = t.__c).__H;
  e && (Vt === ne ? (e.__h = [], ne.__h = [], e.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (e.__h.forEach(Dt), e.__h.forEach(si), e.__h = [], it = 0)), Vt = ne;
}, le.diffed = function(t) {
  Ui && Ui(t);
  var e = t.__c;
  e && e.__H && (e.__H.__h.length && (Fn.push(e) !== 1 && Di === le.requestAnimationFrame || ((Di = le.requestAnimationFrame) || Sr)(xr)), e.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), Vt = ne = null;
}, le.__c = function(t, e) {
  e.some(function(i) {
    try {
      i.__h.forEach(Dt), i.__h = i.__h.filter(function(r) {
        return !r.__ || si(r);
      });
    } catch (r) {
      e.some(function(o) {
        o.__h && (o.__h = []);
      }), e = [], le.__e(r, i.__v);
    }
  }), Bi && Bi(t, e);
}, le.unmount = function(t) {
  Wi && Wi(t);
  var e, i = t.__c;
  i && i.__H && (i.__H.__.forEach(function(r) {
    try {
      Dt(r);
    } catch (o) {
      e = o;
    }
  }), i.__H = void 0, e && le.__e(e, i.__v));
};
var $i = typeof requestAnimationFrame == "function";
function Sr(t) {
  var e, i = function() {
    clearTimeout(r), $i && cancelAnimationFrame(e), setTimeout(t);
  }, r = setTimeout(i, 35);
  $i && (e = requestAnimationFrame(i));
}
function Dt(t) {
  var e = ne, i = t.__c;
  typeof i == "function" && (t.__c = void 0, i()), ne = e;
}
function si(t) {
  var e = ne;
  t.__c = t.__(), ne = e;
}
function xi(t, e) {
  return !t || t.length !== e.length || e.some(function(i, r) {
    return i !== t[r];
  });
}
function Ln(t, e) {
  return typeof e == "function" ? e(t) : e;
}
function $t({ block: t, onNext: e, onBack: i, onDismiss: r, onAction: o, isFirstStep: s, isLastStep: l, onPollChange: a, totalPollsInStep: u, surveyMode: d }) {
  const { type: h, settings: c } = t, p = d || (u ?? 1) > 1, [m, _] = b(null), [x, I] = b(""), [k, E] = b(!1), [v, S] = b(null), [T, F] = b(null), [P, U] = b(!1), [q, Z] = b(null), [N, Q] = b(!1), [X, _e] = b([]), [se, Ae] = b(!1), [ke, be] = b(0), [ce, me] = b(0), [W, he] = b(!1), [re, ve] = b(""), [de, $e] = b(!1), [Ie, Ye] = b(c.min ?? 0), [Se, ge] = b(!1), [xe, M] = b(c.choices || []), [g, te] = b(!1), [oe, Pe] = b({}), [V, He] = b(!1), C = { fontFamily: y.fontFamily };
  switch (h) {
    case "text":
      const ie = c.themeStyle === "title";
      return /* @__PURE__ */ n("div", { style: {
        ...C,
        fontSize: ie ? "22px" : "15px",
        fontWeight: ie ? 700 : 400,
        color: ie ? y.text : y.textMuted,
        lineHeight: 1.4,
        margin: ie ? "0 0 12px 0" : "0 0 8px 0",
        textAlign: "center"
      }, children: c.content });
    case "poll-scale": {
      const $ = c.minValue ?? 1, L = c.maxValue ?? 5, R = Array.from({ length: L - $ + 1 }, (z, Te) => $ + Te);
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "18px", fontWeight: 700, textAlign: "center", margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px" }, children: R.map((z) => /* @__PURE__ */ n("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }, children: [
          /* @__PURE__ */ n(
            "button",
            {
              onClick: () => {
                _(z), d && a?.(t.id, t.type, c.question || "", String(z));
              },
              style: {
                width: "100%",
                aspectRatio: "1/1",
                maxWidth: "50px",
                borderRadius: "12px",
                border: `1.5px solid ${m === z ? y.primary : "#E2E8F0"}`,
                backgroundColor: m === z ? `${y.primary}15` : "#F8FAFC",
                color: m === z ? y.primary : "#64748B",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              children: z
            }
          ),
          c.showLabels && c.labels?.[z] && /* @__PURE__ */ n("span", { style: { fontSize: "10px", fontWeight: 600, color: m === z ? y.primary : "#94a3b8", textAlign: "center" }, children: c.labels[z] })
        ] }, z)) }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: m === null || k,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", String(m)), E(!0), p || setTimeout(() => e(), 600);
            },
            style: {
              backgroundColor: k ? "#16a34a" : m === null ? "#94a3b8" : "#222",
              color: "#fff",
              padding: "12px 40px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: m === null || k ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "background-color 0.2s"
            },
            children: k ? "✓ Submitted" : c.submitLabel || "Submit"
          }
        ) })
      ] });
    }
    case "poll-text":
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "20px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: {
          fontSize: c.themeStyle === "title" ? "20px" : c.themeStyle === "sub-title" ? "16px" : "14px",
          fontWeight: c.themeStyle === "body" ? 500 : 700,
          textAlign: "center",
          margin: 0,
          color: "#222222",
          lineHeight: 1.2
        }, children: c.question }),
        /* @__PURE__ */ n(
          "textarea",
          {
            value: x,
            placeholder: c.placeholder || "Enter text here...",
            onInput: ($) => {
              const L = $.target.value;
              I(L), d && a?.(t.id, t.type, c.question || "", L.trim());
            },
            style: {
              ...C,
              width: "100%",
              minHeight: "120px",
              borderRadius: "16px",
              border: "1px solid #E2E8F0",
              backgroundColor: "#F8FAFC",
              padding: "16px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#222222",
              outline: "none",
              resize: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              boxSizing: "border-box"
            }
          }
        ),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: !x.trim() || k,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", x.trim()), E(!0), p || setTimeout(() => e(), 600);
            },
            style: {
              backgroundColor: k ? "#16a34a" : x.trim() ? "#222222" : "#94a3b8",
              color: "#fff",
              padding: "12px 40px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !x.trim() || k ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "background-color 0.2s"
            },
            children: k ? "✓ Submitted" : c.submitLabel || "Submit"
          }
        ) })
      ] });
    case "poll-yes-no":
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "20px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "18px", fontWeight: 700, textAlign: "center", margin: 0, color: "#222222", lineHeight: 1.2 }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center", gap: "12px" }, children: ["yes", "no"].map(($) => {
          const L = v === $;
          return /* @__PURE__ */ n(
            "button",
            {
              disabled: v !== null,
              onClick: () => {
                a?.(t.id, t.type, c.question || "", $), S($), !d && !p && setTimeout(() => e(), 400);
              },
              style: {
                flex: 1,
                maxWidth: "120px",
                backgroundColor: L ? "#16a34a" : "#222222",
                color: "#fff",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "14px",
                cursor: v !== null ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                opacity: v !== null && v !== $ ? 0.4 : 1,
                transition: "background-color 0.2s, opacity 0.2s"
              },
              children: L ? `✓ ${$ === "yes" ? c.yesLabel || "Yes" : c.noLabel || "No"}` : $ === "yes" ? c.yesLabel || "Yes" : c.noLabel || "No"
            },
            $
          );
        }) })
      ] });
    case "poll-nps": {
      const $ = Array.from({ length: 11 }, (R, z) => z), L = (R) => {
        F(R), a?.(t.id, t.type, c.question || "", String(R)), d || U(!0);
      };
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, textAlign: "center", margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }, children: $.map((R) => /* @__PURE__ */ n(
          "button",
          {
            disabled: P,
            onClick: () => L(R),
            style: {
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1.5px solid",
              borderColor: T === R ? y.primary : R <= 6 ? "#fca5a5" : R <= 8 ? "#fde68a" : "#86efac",
              backgroundColor: T === R ? y.primary : R <= 6 ? "#fff1f2" : R <= 8 ? "#fefce8" : "#f0fdf4",
              color: T === R ? "#fff" : R <= 6 ? "#dc2626" : R <= 8 ? "#ca8a04" : "#16a34a",
              fontSize: "13px",
              fontWeight: 700,
              cursor: P ? "not-allowed" : "pointer",
              transition: "all 0.15s"
            },
            children: R
          },
          R
        )) }),
        /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", padding: "0 2px" }, children: [
          /* @__PURE__ */ n("span", { style: { fontSize: "11px", color: "#94a3b8" }, children: c.lowLabel || "Not at all likely" }),
          /* @__PURE__ */ n("span", { style: { fontSize: "11px", color: "#94a3b8" }, children: c.highLabel || "Extremely likely" })
        ] })
      ] });
    }
    case "poll-multiple-choice": {
      const $ = c.choices || ["Option 1", "Option 2", "Option 3"];
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [
          $.map((L) => {
            const R = q === L;
            return /* @__PURE__ */ n(
              "button",
              {
                disabled: N,
                onClick: () => {
                  Z(L), d && a?.(t.id, t.type, c.question || "", L);
                },
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: `1.5px solid ${R ? y.primary : "#E2E8F0"}`,
                  backgroundColor: R ? `${y.primary}10` : "#F8FAFC",
                  cursor: N ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  fontFamily: y.fontFamily
                },
                children: [
                  /* @__PURE__ */ n("div", { style: {
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `2px solid ${R ? y.primary : "#cbd5e1"}`,
                    backgroundColor: R ? y.primary : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }, children: R && /* @__PURE__ */ n("div", { style: { width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#fff" } }) }),
                  /* @__PURE__ */ n("span", { style: { fontSize: "14px", fontWeight: 500, color: R ? y.primary : "#334155" }, children: L })
                ]
              },
              L
            );
          }),
          c.allowOther && /* @__PURE__ */ n("button", { disabled: !0, style: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #E2E8F0", backgroundColor: "#F8FAFC", textAlign: "left", fontFamily: y.fontFamily }, children: [
            /* @__PURE__ */ n("div", { style: { width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #cbd5e1", flexShrink: 0 } }),
            /* @__PURE__ */ n("span", { style: { fontSize: "14px", fontWeight: 500, color: "#94a3b8" }, children: "Other…" })
          ] })
        ] }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: !q || N,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", q), Q(!0);
            },
            style: {
              backgroundColor: N ? "#16a34a" : q ? "#222" : "#94a3b8",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !q || N ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: N ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-checkboxes": {
      const $ = c.choices || ["Option 1", "Option 2", "Option 3"], L = (R) => {
        const z = X.includes(R) ? X.filter((Te) => Te !== R) : [...X, R];
        _e(z), d && a?.(t.id, t.type, c.question || "", z.join(", "));
      };
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: $.map((R) => {
          const z = X.includes(R);
          return /* @__PURE__ */ n(
            "button",
            {
              disabled: se,
              onClick: () => L(R),
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: `1.5px solid ${z ? y.primary : "#E2E8F0"}`,
                backgroundColor: z ? `${y.primary}10` : "#F8FAFC",
                cursor: se ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                fontFamily: y.fontFamily
              },
              children: [
                /* @__PURE__ */ n("div", { style: {
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  flexShrink: 0,
                  border: `2px solid ${z ? y.primary : "#cbd5e1"}`,
                  backgroundColor: z ? y.primary : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }, children: z && /* @__PURE__ */ n("span", { style: { color: "#fff", fontSize: "11px", fontWeight: 700, lineHeight: 1 }, children: "✓" }) }),
                /* @__PURE__ */ n("span", { style: { fontSize: "14px", fontWeight: 500, color: z ? y.primary : "#334155" }, children: R })
              ]
            },
            R
          );
        }) }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: X.length === 0 || se,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", X.join(", ")), Ae(!0);
            },
            style: {
              backgroundColor: se ? "#16a34a" : X.length === 0 ? "#94a3b8" : "#222",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: X.length === 0 || se ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: se ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-star-rating": {
      const $ = c.maxStars ?? 5;
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, textAlign: "center", margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center", gap: "6px" }, children: Array.from({ length: $ }, (L, R) => R + 1).map((L) => {
          const R = L <= (ke || ce);
          return /* @__PURE__ */ n(
            "button",
            {
              disabled: W,
              onClick: () => {
                me(L), d && a?.(t.id, t.type, c.question || "", String(L));
              },
              onMouseEnter: () => !W && be(L),
              onMouseLeave: () => be(0),
              style: {
                background: "none",
                border: "none",
                cursor: W ? "not-allowed" : "pointer",
                padding: "2px",
                fontSize: "28px",
                transition: "transform 0.1s",
                transform: L <= ke ? "scale(1.15)" : "scale(1)"
              },
              children: /* @__PURE__ */ n("span", { style: { color: R ? "#f59e0b" : "#d1d5db" }, children: "★" })
            },
            L
          );
        }) }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: ce === 0 || W,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", String(ce)), he(!0);
            },
            style: {
              backgroundColor: W ? "#16a34a" : ce === 0 ? "#94a3b8" : "#222",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: ce === 0 || W ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: W ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-dropdown": {
      const $ = c.choices || ["Option 1", "Option 2", "Option 3"];
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n(
          "select",
          {
            value: re,
            disabled: de,
            onChange: (L) => {
              const R = L.target.value;
              ve(R), d && a?.(t.id, t.type, c.question || "", R);
            },
            style: {
              ...C,
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1.5px solid ${re ? y.primary : "#E2E8F0"}`,
              backgroundColor: "#F8FAFC",
              fontSize: "14px",
              color: re ? "#1e293b" : "#94a3b8",
              cursor: de ? "not-allowed" : "pointer",
              outline: "none"
            },
            children: [
              /* @__PURE__ */ n("option", { value: "", disabled: !0, children: "Select an option…" }),
              $.map((L) => /* @__PURE__ */ n("option", { value: L, children: L }, L))
            ]
          }
        ),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: !re || de,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", re), $e(!0);
            },
            style: {
              backgroundColor: de ? "#16a34a" : re ? "#222" : "#94a3b8",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !re || de ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: de ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-slider": {
      const $ = c.min ?? 0, L = c.max ?? 10, R = c.step ?? 1, z = (Ie - $) / (L - $) * 100;
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, textAlign: "center", margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { padding: "8px 4px" }, children: [
          /* @__PURE__ */ n("div", { style: { position: "relative", height: "6px", borderRadius: "3px", backgroundColor: "#E2E8F0", margin: "8px 0" }, children: /* @__PURE__ */ n("div", { style: { position: "absolute", left: 0, top: 0, height: "100%", width: `${z}%`, borderRadius: "3px", backgroundColor: y.primary } }) }),
          /* @__PURE__ */ n(
            "input",
            {
              type: "range",
              min: $,
              max: L,
              step: R,
              value: Ie,
              disabled: Se,
              onInput: (Te) => {
                const Ue = Number(Te.target.value);
                Ye(Ue), d && a?.(t.id, t.type, c.question || "", String(Ue));
              },
              style: { width: "100%", accentColor: y.primary, cursor: Se ? "not-allowed" : "pointer" }
            }
          ),
          /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ n("span", { style: { fontSize: "11px", color: "#94a3b8" }, children: c.minLabel || $ }),
            /* @__PURE__ */ n("span", { style: { fontSize: "13px", fontWeight: 700, color: y.primary }, children: Ie }),
            /* @__PURE__ */ n("span", { style: { fontSize: "11px", color: "#94a3b8" }, children: c.maxLabel || L })
          ] })
        ] }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: Se,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", String(Ie)), ge(!0);
            },
            style: {
              backgroundColor: Se ? "#16a34a" : "#222",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: Se ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: Se ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-ranking": {
      const $ = (L, R) => {
        const z = [...xe], Te = L + R;
        Te < 0 || Te >= z.length || ([z[L], z[Te]] = [z[Te], z[L]], M(z), d && a?.(t.id, t.type, c.question || "", z.join(", ")));
      };
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "6px" }, children: xe.map((L, R) => /* @__PURE__ */ n("div", { style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          borderRadius: "10px",
          border: "1.5px solid #E2E8F0",
          backgroundColor: "#F8FAFC"
        }, children: [
          /* @__PURE__ */ n("span", { style: { fontSize: "12px", fontWeight: 700, color: "#94a3b8", width: "18px" }, children: R + 1 }),
          /* @__PURE__ */ n("span", { style: { flex: 1, fontSize: "14px", fontWeight: 500, color: "#334155" }, children: L }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "2px" }, children: [
            /* @__PURE__ */ n("button", { onClick: () => $(R, -1), disabled: R === 0 || g, style: { background: "none", border: "none", cursor: R === 0 ? "not-allowed" : "pointer", opacity: R === 0 ? 0.3 : 1, padding: "1px 4px", fontSize: "10px", color: "#64748b" }, children: "▲" }),
            /* @__PURE__ */ n("button", { onClick: () => $(R, 1), disabled: R === xe.length - 1 || g, style: { background: "none", border: "none", cursor: R === xe.length - 1 ? "not-allowed" : "pointer", opacity: R === xe.length - 1 ? 0.3 : 1, padding: "1px 4px", fontSize: "10px", color: "#64748b" }, children: "▼" })
          ] })
        ] }, L)) }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: g,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", xe.join(", ")), te(!0);
            },
            style: {
              backgroundColor: g ? "#16a34a" : "#222",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: g ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: g ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-matrix": {
      const $ = c.rows || ["Item 1", "Item 2", "Item 3"], L = c.columns || ["Poor", "Fair", "Good", "Excellent"], R = $.every((z) => oe[z]);
      return /* @__PURE__ */ n("div", { style: { ...C, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0", overflowX: "auto" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: y.text }, children: c.question }),
        /* @__PURE__ */ n("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" }, children: [
          /* @__PURE__ */ n("thead", { children: /* @__PURE__ */ n("tr", { children: [
            /* @__PURE__ */ n("th", { style: { padding: "6px", textAlign: "left" } }),
            L.map((z) => /* @__PURE__ */ n("th", { style: { padding: "6px 4px", textAlign: "center", fontWeight: 600, color: "#64748b", fontSize: "12px" }, children: z }, z))
          ] }) }),
          /* @__PURE__ */ n("tbody", { children: $.map((z, Te) => /* @__PURE__ */ n("tr", { style: { backgroundColor: Te % 2 === 0 ? "#F8FAFC" : "#fff" }, children: [
            /* @__PURE__ */ n("td", { style: { padding: "8px 6px", fontWeight: 500, color: "#334155" }, children: z }),
            L.map((Ue) => {
              const Ve = oe[z] === Ue;
              return /* @__PURE__ */ n("td", { style: { padding: "8px 4px", textAlign: "center" }, children: /* @__PURE__ */ n(
                "button",
                {
                  disabled: V,
                  onClick: () => {
                    const lt = { ...oe, [z]: Ue };
                    Pe(lt), d && a?.(t.id, t.type, c.question || "", JSON.stringify(lt));
                  },
                  style: {
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: `2px solid ${Ve ? y.primary : "#cbd5e1"}`,
                    backgroundColor: Ve ? y.primary : "transparent",
                    cursor: V ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center"
                  },
                  children: Ve && /* @__PURE__ */ n("div", { style: { width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#fff" } })
                }
              ) }, Ue);
            })
          ] }, z)) })
        ] }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: !R || V,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", JSON.stringify(oe)), He(!0);
            },
            style: {
              backgroundColor: V ? "#16a34a" : R ? "#222" : "#94a3b8",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !R || V ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: V ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "button":
      const we = (c.label || "").toLowerCase(), qe = c.action || "next";
      return /* @__PURE__ */ n("div", { style: { display: "flex", gap: "12px", width: "100%", margin: "8px 0" }, children: [
        qe === "next" && !s && /* @__PURE__ */ n(
          "button",
          {
            onClick: i,
            style: {
              flex: 1,
              padding: "12px 24px",
              borderRadius: "10px",
              border: `1.5px solid ${y.border}`,
              backgroundColor: "transparent",
              color: y.text,
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer"
            },
            children: "Back"
          }
        ),
        /* @__PURE__ */ n(
          "button",
          {
            onClick: () => {
              qe === "next" ? e() : qe === "dismiss" ? r() : qe === "url" && c.url && o(c.url);
            },
            style: {
              flex: 2,
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: y.primary,
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)"
            },
            children: c.label || (l ? "Finish" : "Next")
          }
        )
      ] });
    case "image":
      return /* @__PURE__ */ n("div", { style: { width: "100%", backgroundColor: "#f1f5f9", display: "flex", justifyContent: "center", margin: "0 0 16px 0" }, children: /* @__PURE__ */ n(
        "img",
        {
          src: c.url,
          alt: "Guide Media",
          style: { width: "100%", maxHeight: "300px", objectFit: "cover" }
        }
      ) });
    case "video":
      return /* @__PURE__ */ n("div", { style: { position: "relative", width: "100%", paddingTop: "56.25%", margin: "0 0 16px 0" }, children: /* @__PURE__ */ n(
        "iframe",
        {
          src: c.url,
          style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" },
          allowFullScreen: !0
        }
      ) });
    case "horizontal-line":
      return /* @__PURE__ */ n("hr", { style: { border: "none", borderTop: `1px solid ${y.border}`, margin: "16px 0" } });
    default:
      return null;
  }
}
function wr({
  content: t,
  onDismiss: e,
  onNext: i,
  onBack: r,
  onAction: o,
  isFirstStep: s,
  isLastStep: l,
  onPollChange: a,
  surveyMode: u
}) {
  const d = Me(() => {
    try {
      return JSON.parse(t);
    } catch {
      return { title: "Untitled" };
    }
  }, [t]), h = Me(() => {
    const p = d.layout || {}, m = {
      center: ["center", "center"],
      top: ["flex-start", "center"],
      bottom: ["flex-end", "center"],
      "top-left": ["flex-start", "flex-start"],
      "top-right": ["flex-start", "flex-end"],
      "bottom-left": ["flex-end", "flex-start"],
      "bottom-right": ["flex-end", "flex-end"]
    };
    let _ = "center", x = "center";
    if (p.position && m[p.position])
      [_, x] = m[p.position];
    else if (p.verticalAlignment || p.horizontalAlignment) {
      const I = { top: "flex-start", center: "center", bottom: "flex-end" }, k = { left: "flex-start", center: "center", right: "flex-end" };
      _ = I[p.verticalAlignment || "center"] ?? "center", x = k[p.horizontalAlignment || "center"] ?? "center";
    }
    return {
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: _,
      justifyContent: x,
      backgroundColor: d.backdropColor || "rgba(0, 0, 0, 0.5)",
      zIndex: y.zIndex.guides,
      pointerEvents: "auto",
      padding: "40px",
      // Prevent sticking to edges
      backdropFilter: "blur(2px)",
      transition: "all 0.3s ease-out"
    };
  }, [d]);
  return /* @__PURE__ */ n(
    "div",
    {
      className: "designer-guide-modal-overlay",
      onClick: (p) => {
        p.target === p.currentTarget && d.backdropDismiss !== !1 && e();
      },
      style: h,
      children: [
        /* @__PURE__ */ n(
          "div",
          {
            className: "designer-guide-modal-card",
            style: {
              position: "relative",
              width: "90%",
              maxWidth: "500px",
              backgroundColor: y.bg,
              borderRadius: "16px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              fontFamily: y.fontFamily,
              animation: "designer-modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            },
            onClick: (p) => p.stopPropagation(),
            children: [
              /* @__PURE__ */ n(
                "button",
                {
                  onClick: e,
                  style: {
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#64748b",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    zIndex: 10
                  },
                  children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "20px" } })
                }
              ),
              /* @__PURE__ */ n("div", { style: { padding: "24px" }, children: d.blocks && d.blocks.length > 0 ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column" }, children: (() => {
                const p = d.blocks.filter((m) => m.type.startsWith("poll-")).length;
                return d.blocks.map((m) => /* @__PURE__ */ n(
                  $t,
                  {
                    block: m,
                    onNext: i,
                    onBack: r,
                    onDismiss: e,
                    onAction: o,
                    isFirstStep: s,
                    isLastStep: l,
                    onPollChange: a,
                    totalPollsInStep: p,
                    surveyMode: u
                  },
                  m.id
                ));
              })() }) : (
                /* Fallback Legacy Rendering */
                /* @__PURE__ */ n("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ n("h2", { style: { margin: "0 0 12px 0", fontSize: "22px", fontWeight: 700, color: y.text }, children: d.title }),
                  d.body && /* @__PURE__ */ n("p", { style: { margin: 0, fontSize: "15px", color: y.textMuted }, children: d.body }),
                  /* @__PURE__ */ n("div", { style: { display: "flex", gap: "12px", marginTop: "24px" }, children: [
                    !s && /* @__PURE__ */ n(
                      "button",
                      {
                        onClick: r,
                        style: {
                          flex: 1,
                          padding: "12px 24px",
                          borderRadius: "10px",
                          border: `1.5px solid ${y.border}`,
                          backgroundColor: "transparent",
                          color: y.text,
                          fontSize: "15px",
                          fontWeight: 600,
                          cursor: "pointer"
                        },
                        children: "Back"
                      }
                    ),
                    /* @__PURE__ */ n(
                      "button",
                      {
                        onClick: i,
                        style: {
                          flex: 2,
                          padding: "12px 24px",
                          borderRadius: "10px",
                          border: "none",
                          backgroundColor: y.primary,
                          color: "#ffffff",
                          fontSize: "15px",
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)"
                        },
                        children: l ? "Finish" : d.cta1Text || "Next"
                      }
                    )
                  ] })
                ] })
              ) })
            ]
          }
        ),
        /* @__PURE__ */ n("style", { children: `
        @keyframes designer-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      ` })
      ]
    }
  );
}
const zn = "Template", Dn = "Description", Cr = "Next";
function Er(t) {
  try {
    return JSON.parse(t || "{}");
  } catch {
    return { title: zn, description: Dn };
  }
}
const kr = {
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  paddingTop: 24,
  paddingRight: 16,
  paddingBottom: 24,
  paddingLeft: 16,
  fontFamily: y.fontFamily
};
function Ir({
  title: t = zn,
  description: e = Dn,
  buttonContent: i = Cr,
  onNext: r,
  onBack: o,
  isFirstStep: s = !1
}) {
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: 4, position: "relative" }, children: [
    /* @__PURE__ */ n("h3", { style: { fontSize: 14, fontWeight: 600, color: "#1855BC", lineHeight: 1.3, margin: 0 }, children: t }),
    /* @__PURE__ */ n("p", { style: { fontSize: 11, color: "#6b7280", lineHeight: 1.4, margin: 0 }, children: e }),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: 8, justifyContent: "center", paddingTop: 4 }, children: [
      !s && /* @__PURE__ */ n(
        "button",
        {
          onClick: (l) => {
            l.stopPropagation(), o?.();
          },
          style: {
            background: "transparent",
            color: "#007AFF",
            padding: "6px 16px",
            border: "1px solid #007AFF",
            borderRadius: 9999,
            fontWeight: 600,
            fontSize: 10,
            cursor: "pointer"
          },
          children: "Back"
        }
      ),
      /* @__PURE__ */ n(
        "button",
        {
          onClick: (l) => {
            l.stopPropagation(), r?.();
          },
          style: {
            display: "inline-block",
            background: "#007AFF",
            color: "#fff",
            padding: "6px 20px",
            border: "none",
            borderRadius: 9999,
            fontWeight: 600,
            fontSize: 10,
            cursor: "pointer",
            transition: "opacity 0.2s"
          },
          onMouseEnter: (l) => l.currentTarget.style.opacity = "0.9",
          onMouseLeave: (l) => l.currentTarget.style.opacity = "1",
          children: i
        }
      )
    ] })
  ] });
}
function Tr({ template: t, top: e, left: i, onDismiss: r, onNext: o, onBack: s, isFirstStep: l, isLastStep: a, onPollChange: u, surveyMode: d }) {
  const h = Me(() => Er(Re(t)), [t]), p = t.template?.template_key === "tooltip-scratch";
  return /* @__PURE__ */ n(
    "div",
    {
      style: {
        position: "absolute",
        top: `${e}px`,
        left: `${i}px`,
        zIndex: y.zIndex.tooltip,
        pointerEvents: "auto",
        maxWidth: 300,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "top, left"
      },
      children: /* @__PURE__ */ n("div", { style: { position: "relative", width: "100%", margin: "0 auto", paddingTop: p ? 12 : 0 }, children: [
        p && /* @__PURE__ */ n(
          "div",
          {
            style: {
              position: "absolute",
              left: 16,
              top: -24,
              // Adjusted for the 44px icon height to align better
              display: "flex",
              justifyContent: "center"
            },
            children: /* @__PURE__ */ n("iconify-icon", { icon: "iconamoon:arrow-up-2-light", style: { fontSize: 44, color: "#1855BC" } })
          }
        ),
        /* @__PURE__ */ n("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 8, ...kr }, children: [
          /* @__PURE__ */ n(
            "div",
            {
              onClick: r,
              style: {
                position: "absolute",
                top: 8,
                right: 8,
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b7280",
                cursor: "pointer"
              },
              children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: 14 } })
            }
          ),
          h.blocks && h.blocks.length > 0 ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column" }, children: (() => {
            const m = h.blocks.filter((_) => _.type.startsWith("poll-")).length;
            return h.blocks.map((_) => /* @__PURE__ */ n(
              $t,
              {
                block: _,
                onNext: o,
                onBack: s,
                onDismiss: r,
                onAction: (x) => window.open(x, "_blank"),
                isFirstStep: l,
                isLastStep: a,
                onPollChange: u,
                totalPollsInStep: m,
                surveyMode: d
              },
              _.id
            ));
          })() }) : /* @__PURE__ */ n(
            Ir,
            {
              title: h.title,
              description: h.description,
              buttonContent: h.buttonContent,
              onNext: o,
              onBack: s,
              isFirstStep: l
            }
          )
        ] })
      ] })
    }
  );
}
function Rr({
  content: t,
  onDismiss: e,
  onNext: i,
  onBack: r,
  onAction: o,
  isFirstStep: s,
  isLastStep: l,
  onPollChange: a,
  surveyMode: u
}) {
  const d = Me(() => {
    try {
      return JSON.parse(t);
    } catch {
      return {};
    }
  }, [t]), h = d.layout?.position === "bottom" ? "bottom" : "top", c = {
    position: "fixed",
    [h]: 0,
    left: 0,
    width: "100%",
    background: "#ffffff",
    borderTop: h === "bottom" ? `3px solid ${y.primary}` : "none",
    borderBottom: h === "top" ? `3px solid ${y.primary}` : "none",
    boxShadow: h === "top" ? "0 4px 16px rgba(0,0,0,0.10)" : "0 -4px 16px rgba(0,0,0,0.10)",
    zIndex: y.zIndex.guides,
    fontFamily: y.fontFamily,
    animation: h === "top" ? "banner-slide-down 0.3s ease" : "banner-slide-up 0.3s ease",
    pointerEvents: "auto"
  }, p = d.blocks ?? [], m = p.filter((_) => _.type.startsWith("poll-")).length;
  return /* @__PURE__ */ n(ee, { children: [
    /* @__PURE__ */ n("style", { children: `
        @keyframes banner-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes banner-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      ` }),
    /* @__PURE__ */ n("div", { style: c, children: /* @__PURE__ */ n("div", { style: {
      maxWidth: "960px",
      margin: "0 auto",
      padding: "12px 48px 12px 20px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
      position: "relative"
    }, children: [
      p.length > 0 ? p.map((_) => /* @__PURE__ */ n("div", { style: { flex: _.type === "button" ? "0 0 auto" : "1 1 auto", minWidth: 0 }, children: /* @__PURE__ */ n(
        $t,
        {
          block: _,
          onNext: i,
          onBack: r,
          onDismiss: e,
          onAction: o,
          isFirstStep: s,
          isLastStep: l,
          onPollChange: a,
          totalPollsInStep: m,
          surveyMode: u
        }
      ) }, _.id)) : /* @__PURE__ */ n("span", { style: { fontSize: "14px", color: y.textMuted, fontFamily: y.fontFamily }, children: "Banner — add blocks to show content" }),
      /* @__PURE__ */ n(
        "button",
        {
          onClick: e,
          style: {
            position: "absolute",
            top: "50%",
            right: "12px",
            transform: "translateY(-50%)",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#f1f5f9",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#64748b",
            flexShrink: 0
          },
          children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "16px" } })
        }
      )
    ] }) })
  ] });
}
function Or({ targetRect: t }) {
  if (!t) return null;
  const e = 5;
  return /* @__PURE__ */ n(
    "div",
    {
      id: "designer-spotlight-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: y.zIndex.overlay,
        overflow: "hidden"
      },
      children: /* @__PURE__ */ n(
        "div",
        {
          id: "designer-spotlight-hole",
          style: {
            position: "absolute",
            top: t.top - e,
            left: t.left - e,
            width: t.width + e * 2,
            height: t.height + e * 2,
            borderRadius: "5px",
            border: "1.5px solid #222222",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
            pointerEvents: "none",
            transition: "all 0.3s ease-in-out"
          }
        }
      )
    }
  );
}
function Ar(t) {
  const e = { position: "absolute" };
  switch (t) {
    case "top":
      return { ...e, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${y.primary} transparent transparent transparent` };
    case "bottom":
      return { ...e, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${y.primary} transparent` };
    case "left":
      return { ...e, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${y.primary}` };
    default:
      return { ...e, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${y.primary} transparent transparent` };
  }
}
function Hi(t, e, i, r) {
  const o = t.getBoundingClientRect();
  let s = 0, l = 0;
  switch (e) {
    case "top":
      s = o.top - r - 12, l = o.left + o.width / 2 - i / 2;
      break;
    case "bottom":
      s = o.bottom + 12, l = o.left + o.width / 2 - i / 2;
      break;
    case "left":
      s = o.top + o.height / 2 - r / 2, l = o.left - i - 12;
      break;
    default:
      s = o.top + o.height / 2 - r / 2, l = o.right + 12;
      break;
  }
  const a = window.innerWidth, u = window.innerHeight;
  return l < 10 ? l = 10 : l + i > a - 10 && (l = a - i - 10), s < 10 ? s = 10 : s + r > u - 10 && (s = u - r - 10), { top: s, left: l, arrowStyle: Ar(e) };
}
class Pr {
  container = null;
  onDismiss = () => {
  };
  onNext = () => {
  };
  onPollResponse = () => {
  };
  lastGuides = [];
  triggeredGuide = null;
  currentStepIndex = 0;
  dismissedThisSession = /* @__PURE__ */ new Set();
  surveyPendingAnswers = /* @__PURE__ */ new Map();
  setOnDismiss(e) {
    this.onDismiss = e;
  }
  setOnNext(e) {
    this.onNext = e;
  }
  setOnPollResponse(e) {
    this.onPollResponse = e;
  }
  isSurveyMode() {
    return this.triggeredGuide?.type === "survey";
  }
  firePollResponse(e, i, r, o) {
    if (!this.triggeredGuide) return;
    if (this.isSurveyMode()) {
      this.surveyPendingAnswers.set(e, { pollType: i, question: r, value: o });
      return;
    }
    const a = [...(this.triggeredGuide.templates || []).filter((u) => u.is_active)].sort((u, d) => u.step_order - d.step_order)[this.currentStepIndex];
    a && this.onPollResponse(this.triggeredGuide, a.template_id, e, i, r, o, this.currentStepIndex);
  }
  flushSurveyAnswers() {
    if (!this.triggeredGuide || this.surveyPendingAnswers.size === 0) return;
    const r = [...(this.triggeredGuide.templates || []).filter((o) => o.is_active)].sort((o, s) => o.step_order - s.step_order)[this.currentStepIndex];
    if (r) {
      for (const [o, { pollType: s, question: l, value: a }] of this.surveyPendingAnswers)
        this.onPollResponse(this.triggeredGuide, r.template_id, o, s, l, a, this.currentStepIndex);
      this.surveyPendingAnswers.clear();
    }
  }
  renderGuides(e) {
    this.lastGuides = e;
    const i = je(), r = e.filter(
      (c) => c.page === i && c.status === "active" && !this.dismissedThisSession.has(c.id)
    );
    if (this.ensureContainer(), !this.container) return;
    const o = [], s = [];
    for (const c of r) {
      const p = Ne.findElement(c.selector);
      if (!p) continue;
      qt(p);
      const m = Hi(p, c.placement, 280, 80);
      o.push({ guide: c, target: p, pos: m });
    }
    if (this.triggeredGuide && !this.dismissedThisSession.has(this.triggeredGuide.guide_id)) {
      const m = [...(this.triggeredGuide.templates || []).filter((_) => _.is_active)].sort((_, x) => _.step_order - x.step_order)[this.currentStepIndex];
      if (m && m.x_path) {
        const _ = Ne.findElement(m.x_path);
        if (_) {
          qt(_);
          const x = Hi(_, "bottom", 300, 160), I = _.getBoundingClientRect(), k = I.left + I.width / 2;
          x.left = k - 16 - 16;
          const E = window.innerWidth;
          x.left < 10 ? x.left = 10 : x.left + 300 > E - 10 && (x.left = E - 300 - 10), s.push({ template: m, target: _, pos: x, targetRect: I });
        } else
          console.warn(`[Visual Designer] Target element not found for template "${m.template_id}" using selector: ${m.x_path}`);
      }
    }
    const a = [...(this.triggeredGuide?.templates || []).filter((c) => c.is_active)].sort((c, p) => c.step_order - p.step_order), u = a[this.currentStepIndex], d = !!u && !u.x_path && (() => {
      try {
        return JSON.parse(Re(u)).layout?.renderAs === "banner";
      } catch {
        return !1;
      }
    })(), h = !d && !u?.x_path;
    if (o.length === 0 && s.length === 0 && !u) {
      Qe(null, this.container);
      return;
    }
    Qe(
      /* @__PURE__ */ n(
        "div",
        {
          id: "designer-guides-container",
          style: {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: y.zIndex.guides,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          },
          children: [
            s.length > 0 && /* @__PURE__ */ n(Or, { targetRect: s[0].targetRect }),
            o.map(({ guide: c, pos: p }) => /* @__PURE__ */ n(
              yr,
              {
                guide: c,
                top: p.top,
                left: p.left,
                arrowStyle: p.arrowStyle,
                onDismiss: () => this.dismissGuide(c.id)
              },
              c.id
            )),
            s.map(({ template: c, pos: p }) => /* @__PURE__ */ n(
              Tr,
              {
                template: c,
                top: p.top,
                left: p.left,
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (m, _, x, I) => this.firePollResponse(m, _, x, I),
                surveyMode: this.isSurveyMode()
              },
              this.triggeredGuide.guide_id
            )),
            d && u && /* @__PURE__ */ n(
              Rr,
              {
                content: Re(u),
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                onAction: (c) => window.location.href = c,
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (c, p, m, _) => this.firePollResponse(c, p, m, _),
                surveyMode: this.isSurveyMode()
              },
              `${this.triggeredGuide.guide_id}-${this.currentStepIndex}`
            ),
            h && u && /* @__PURE__ */ n(
              wr,
              {
                content: Re(u),
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                onAction: (c) => window.location.href = c,
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (c, p, m, _) => this.firePollResponse(c, p, m, _),
                surveyMode: this.isSurveyMode()
              },
              `${this.triggeredGuide.guide_id}-${this.currentStepIndex}`
            )
          ]
        }
      ),
      this.container
    );
  }
  async renderTriggeredGuide(e) {
    this.triggeredGuide = e, this.currentStepIndex = 0, this.dismissedThisSession.delete(e.guide_id);
    const o = [...(e.templates || []).filter((s) => s.is_active)].sort((s, l) => s.step_order - l.step_order)[0];
    if (o && o.x_path)
      try {
        await Ne.waitForElement(o.x_path);
      } catch (s) {
        console.warn(`[Visual Designer] Timeout waiting for first step element: ${o.x_path}`, s);
      }
    this.renderGuides(this.lastGuides);
  }
  handleBack() {
    if (!this.triggeredGuide || this.currentStepIndex === 0) return;
    this.surveyPendingAnswers.clear(), this.currentStepIndex--;
    const r = [...(this.triggeredGuide.templates || []).filter((o) => o.is_active)].sort((o, s) => o.step_order - s.step_order)[this.currentStepIndex];
    if (r?.x_path) {
      const o = Ne.findElement(r.x_path);
      o && qt(o);
    }
    this.renderGuides(this.lastGuides);
  }
  async handleNext() {
    if (!this.triggeredGuide) return;
    this.isSurveyMode() && this.flushSurveyAnswers();
    const i = [...(this.triggeredGuide.templates || []).filter((o) => o.is_active)].sort((o, s) => o.step_order - s.step_order), r = i[this.currentStepIndex];
    if (this.onNext(this.triggeredGuide, this.currentStepIndex, i.length), r && r.auto_click_target && r.x_path) {
      console.log(`[Visual Designer] Auto-clicking target element for step: ${r.template_id}`);
      const o = Ne.findElement(r.x_path);
      o instanceof HTMLElement ? o.click() : o && o.click?.();
    }
    if (this.currentStepIndex < i.length - 1) {
      this.currentStepIndex++;
      const o = i[this.currentStepIndex];
      if (o && o.x_path)
        try {
          this.renderGuides(this.lastGuides), await Ne.waitForElement(o.x_path);
        } catch {
          console.warn(`[Visual Designer] Target element not found for step: ${o.template_id}`);
        }
      this.renderGuides(this.lastGuides);
    } else
      this.dismissTriggeredGuide();
  }
  dismissTriggeredGuide() {
    if (this.triggeredGuide) {
      const e = this.triggeredGuide, i = this.currentStepIndex;
      this.dismissedThisSession.add(e.guide_id), this.onDismiss(e, i), this.triggeredGuide = null, this.renderGuides(this.lastGuides);
    }
  }
  updatePositions(e) {
    this.renderGuides(e);
  }
  dismissGuide(e) {
    this.dismissedThisSession.add(e);
    const i = this.lastGuides.find((r) => r.id === e);
    i && this.onDismiss({
      guide_id: i.id,
      guide_name: i.content || "Untitled Guide",
      templates: []
    }, 0), this.renderGuides(this.lastGuides);
  }
  clear() {
    this.dismissedThisSession.clear(), this.container && Qe(null, this.container);
  }
  clearTriggeredGuide() {
    this.triggeredGuide = null, this.currentStepIndex = 0, this.container && Qe(null, this.container);
  }
  ensureContainer() {
    if (!this.container) {
      if (!document.body) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => this.ensureContainer());
          return;
        }
        setTimeout(() => this.ensureContainer(), 100);
        return;
      }
      this.container = document.createElement("div"), this.container.id = "designer-guides-root", this.container.style.position = "fixed", this.container.style.top = "0", this.container.style.left = "0", this.container.style.width = "100vw", this.container.style.height = "100vh", this.container.style.pointerEvents = "none", this.container.style.zIndex = String(y.zIndex.guides), document.body.appendChild(this.container);
    }
  }
}
const qi = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function Fr({ feature: t, color: e, rect: i }) {
  return /* @__PURE__ */ n(
    "div",
    {
      className: "designer-feature-heatmap-overlay",
      title: t.featureName,
      style: {
        position: "fixed",
        left: i.left,
        top: i.top,
        width: i.width,
        height: i.height,
        backgroundColor: e,
        pointerEvents: "none",
        zIndex: y.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${e}`
      }
    }
  );
}
class Lr {
  container = null;
  lastEnabled = !1;
  render(e, i) {
    if (this.lastEnabled = i, this.clear(), !i || e.length === 0) return;
    const r = e.filter((s) => (s.selector || "").trim() !== "");
    if (this.ensureContainer(), !this.container) return;
    const o = r.map((s, l) => {
      const a = Ne.findElement(s.selector);
      if (!a) return null;
      const u = a.getBoundingClientRect(), d = qi[l % qi.length];
      return { feature: s, rect: u, color: d };
    }).filter(Boolean);
    o.length !== 0 && Qe(
      /* @__PURE__ */ n(
        "div",
        {
          id: "designer-feature-heatmap-container",
          style: {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: y.zIndex.overlay - 1
          },
          children: o.map(({ feature: s, rect: l, color: a }) => /* @__PURE__ */ n(
            Fr,
            {
              feature: s,
              color: a,
              rect: {
                left: l.left,
                top: l.top,
                width: l.width,
                height: l.height
              }
            },
            s.id
          ))
        }
      ),
      this.container
    );
  }
  updatePositions(e) {
    this.render(e, this.lastEnabled);
  }
  clear() {
    this.container && Qe(null, this.container);
  }
  destroy() {
    this.clear(), this.container?.remove(), this.container = null;
  }
  ensureContainer() {
    if (!this.container) {
      if (!document.body) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => this.ensureContainer());
          return;
        }
        setTimeout(() => this.ensureContainer(), 100);
        return;
      }
      this.container = document.createElement("div"), this.container.id = "designer-feature-heatmap-root", document.body.appendChild(this.container);
    }
  }
}
var at = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set(), this.subscribe = this.subscribe.bind(this);
  }
  subscribe(t) {
    return this.listeners.add(t), this.onSubscribe(), () => {
      this.listeners.delete(t), this.onUnsubscribe();
    };
  }
  hasListeners() {
    return this.listeners.size > 0;
  }
  onSubscribe() {
  }
  onUnsubscribe() {
  }
}, zr = {
  // We need the wrapper function syntax below instead of direct references to
  // global setTimeout etc.
  //
  // BAD: `setTimeout: setTimeout`
  // GOOD: `setTimeout: (cb, delay) => setTimeout(cb, delay)`
  //
  // If we use direct references here, then anything that wants to spy on or
  // replace the global setTimeout (like tests) won't work since we'll already
  // have a hard reference to the original implementation at the time when this
  // file was imported.
  setTimeout: (t, e) => setTimeout(t, e),
  clearTimeout: (t) => clearTimeout(t),
  setInterval: (t, e) => setInterval(t, e),
  clearInterval: (t) => clearInterval(t)
}, Dr = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = zr;
  #t = !1;
  setTimeoutProvider(t) {
    this.#e = t;
  }
  setTimeout(t, e) {
    return this.#e.setTimeout(t, e);
  }
  clearTimeout(t) {
    this.#e.clearTimeout(t);
  }
  setInterval(t, e) {
    return this.#e.setInterval(t, e);
  }
  clearInterval(t) {
    this.#e.clearInterval(t);
  }
}, tt = new Dr();
function Nr(t) {
  setTimeout(t, 0);
}
var nt = typeof window > "u" || "Deno" in globalThis;
function Ee() {
}
function Mr(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function ai(t) {
  return typeof t == "number" && t >= 0 && t !== 1 / 0;
}
function Nn(t, e) {
  return Math.max(t + (e || 0) - Date.now(), 0);
}
function Ke(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function ze(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function Vi(t, e) {
  const {
    type: i = "all",
    exact: r,
    fetchStatus: o,
    predicate: s,
    queryKey: l,
    stale: a
  } = t;
  if (l) {
    if (r) {
      if (e.queryHash !== Si(l, e.options))
        return !1;
    } else if (!_t(e.queryKey, l))
      return !1;
  }
  if (i !== "all") {
    const u = e.isActive();
    if (i === "active" && !u || i === "inactive" && u)
      return !1;
  }
  return !(typeof a == "boolean" && e.isStale() !== a || o && o !== e.state.fetchStatus || s && !s(e));
}
function ji(t, e) {
  const { exact: i, status: r, predicate: o, mutationKey: s } = t;
  if (s) {
    if (!e.options.mutationKey)
      return !1;
    if (i) {
      if (rt(e.options.mutationKey) !== rt(s))
        return !1;
    } else if (!_t(e.options.mutationKey, s))
      return !1;
  }
  return !(r && e.state.status !== r || o && !o(e));
}
function Si(t, e) {
  return (e?.queryKeyHashFn || rt)(t);
}
function rt(t) {
  return JSON.stringify(
    t,
    (e, i) => li(i) ? Object.keys(i).sort().reduce((r, o) => (r[o] = i[o], r), {}) : i
  );
}
function _t(t, e) {
  return t === e ? !0 : typeof t != typeof e ? !1 : t && e && typeof t == "object" && typeof e == "object" ? Object.keys(e).every((i) => _t(t[i], e[i])) : !1;
}
var Ur = Object.prototype.hasOwnProperty;
function Mn(t, e, i = 0) {
  if (t === e)
    return t;
  if (i > 500) return e;
  const r = Qi(t) && Qi(e);
  if (!r && !(li(t) && li(e))) return e;
  const s = (r ? t : Object.keys(t)).length, l = r ? e : Object.keys(e), a = l.length, u = r ? new Array(a) : {};
  let d = 0;
  for (let h = 0; h < a; h++) {
    const c = r ? h : l[h], p = t[c], m = e[c];
    if (p === m) {
      u[c] = p, (r ? h < s : Ur.call(t, c)) && d++;
      continue;
    }
    if (p === null || m === null || typeof p != "object" || typeof m != "object") {
      u[c] = m;
      continue;
    }
    const _ = Mn(p, m, i + 1);
    u[c] = _, _ === p && d++;
  }
  return s === a && d === s ? t : u;
}
function Bt(t, e) {
  if (!e || Object.keys(t).length !== Object.keys(e).length)
    return !1;
  for (const i in t)
    if (t[i] !== e[i])
      return !1;
  return !0;
}
function Qi(t) {
  return Array.isArray(t) && t.length === Object.keys(t).length;
}
function li(t) {
  if (!Ki(t))
    return !1;
  const e = t.constructor;
  if (e === void 0)
    return !0;
  const i = e.prototype;
  return !(!Ki(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(t) !== Object.prototype);
}
function Ki(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function Br(t) {
  return new Promise((e) => {
    tt.setTimeout(e, t);
  });
}
function ci(t, e, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(t, e) : i.structuralSharing !== !1 ? Mn(t, e) : e;
}
function Wr(t, e, i = 0) {
  const r = [...t, e];
  return i && r.length > i ? r.slice(1) : r;
}
function Gr(t, e, i = 0) {
  const r = [e, ...t];
  return i && r.length > i ? r.slice(0, -1) : r;
}
var wi = /* @__PURE__ */ Symbol();
function Un(t, e) {
  return !t.queryFn && e?.initialPromise ? () => e.initialPromise : !t.queryFn || t.queryFn === wi ? () => Promise.reject(new Error(`Missing queryFn: '${t.queryHash}'`)) : t.queryFn;
}
function Ci(t, e) {
  return typeof t == "function" ? t(...e) : !!t;
}
function $r(t, e, i) {
  let r = !1, o;
  return Object.defineProperty(t, "signal", {
    enumerable: !0,
    get: () => (o ??= e(), r || (r = !0, o.aborted ? i() : o.addEventListener("abort", i, { once: !0 })), o)
  }), t;
}
var Hr = class extends at {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!nt && window.addEventListener) {
        const e = () => t();
        return window.addEventListener("visibilitychange", e, !1), () => {
          window.removeEventListener("visibilitychange", e);
        };
      }
    };
  }
  onSubscribe() {
    this.#t || this.setEventListener(this.#i);
  }
  onUnsubscribe() {
    this.hasListeners() || (this.#t?.(), this.#t = void 0);
  }
  setEventListener(t) {
    this.#i = t, this.#t?.(), this.#t = t((e) => {
      typeof e == "boolean" ? this.setFocused(e) : this.onFocus();
    });
  }
  setFocused(t) {
    this.#e !== t && (this.#e = t, this.onFocus());
  }
  onFocus() {
    const t = this.isFocused();
    this.listeners.forEach((e) => {
      e(t);
    });
  }
  isFocused() {
    return typeof this.#e == "boolean" ? this.#e : globalThis.document?.visibilityState !== "hidden";
  }
}, Ei = new Hr();
function di() {
  let t, e;
  const i = new Promise((o, s) => {
    t = o, e = s;
  });
  i.status = "pending", i.catch(() => {
  });
  function r(o) {
    Object.assign(i, o), delete i.resolve, delete i.reject;
  }
  return i.resolve = (o) => {
    r({
      status: "fulfilled",
      value: o
    }), t(o);
  }, i.reject = (o) => {
    r({
      status: "rejected",
      reason: o
    }), e(o);
  }, i;
}
var qr = Nr;
function Vr() {
  let t = [], e = 0, i = (a) => {
    a();
  }, r = (a) => {
    a();
  }, o = qr;
  const s = (a) => {
    e ? t.push(a) : o(() => {
      i(a);
    });
  }, l = () => {
    const a = t;
    t = [], a.length && o(() => {
      r(() => {
        a.forEach((u) => {
          i(u);
        });
      });
    });
  };
  return {
    batch: (a) => {
      let u;
      e++;
      try {
        u = a();
      } finally {
        e--, e || l();
      }
      return u;
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: (a) => (...u) => {
      s(() => {
        a(...u);
      });
    },
    schedule: s,
    /**
     * Use this method to set a custom notify function.
     * This can be used to for example wrap notifications with `React.act` while running tests.
     */
    setNotifyFunction: (a) => {
      i = a;
    },
    /**
     * Use this method to set a custom function to batch notifications together into a single tick.
     * By default React Query will use the batch function provided by ReactDOM or React Native.
     */
    setBatchNotifyFunction: (a) => {
      r = a;
    },
    setScheduler: (a) => {
      o = a;
    }
  };
}
var ue = Vr(), jr = class extends at {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!nt && window.addEventListener) {
        const e = () => t(!0), i = () => t(!1);
        return window.addEventListener("online", e, !1), window.addEventListener("offline", i, !1), () => {
          window.removeEventListener("online", e), window.removeEventListener("offline", i);
        };
      }
    };
  }
  onSubscribe() {
    this.#t || this.setEventListener(this.#i);
  }
  onUnsubscribe() {
    this.hasListeners() || (this.#t?.(), this.#t = void 0);
  }
  setEventListener(t) {
    this.#i = t, this.#t?.(), this.#t = t(this.setOnline.bind(this));
  }
  setOnline(t) {
    this.#e !== t && (this.#e = t, this.listeners.forEach((i) => {
      i(t);
    }));
  }
  isOnline() {
    return this.#e;
  }
}, Wt = new jr();
function Qr(t) {
  return Math.min(1e3 * 2 ** t, 3e4);
}
function Bn(t) {
  return (t ?? "online") === "online" ? Wt.isOnline() : !0;
}
var ui = class extends Error {
  constructor(t) {
    super("CancelledError"), this.revert = t?.revert, this.silent = t?.silent;
  }
};
function Wn(t) {
  let e = !1, i = 0, r;
  const o = di(), s = () => o.status !== "pending", l = (x) => {
    if (!s()) {
      const I = new ui(x);
      p(I), t.onCancel?.(I);
    }
  }, a = () => {
    e = !0;
  }, u = () => {
    e = !1;
  }, d = () => Ei.isFocused() && (t.networkMode === "always" || Wt.isOnline()) && t.canRun(), h = () => Bn(t.networkMode) && t.canRun(), c = (x) => {
    s() || (r?.(), o.resolve(x));
  }, p = (x) => {
    s() || (r?.(), o.reject(x));
  }, m = () => new Promise((x) => {
    r = (I) => {
      (s() || d()) && x(I);
    }, t.onPause?.();
  }).then(() => {
    r = void 0, s() || t.onContinue?.();
  }), _ = () => {
    if (s())
      return;
    let x;
    const I = i === 0 ? t.initialPromise : void 0;
    try {
      x = I ?? t.fn();
    } catch (k) {
      x = Promise.reject(k);
    }
    Promise.resolve(x).then(c).catch((k) => {
      if (s())
        return;
      const E = t.retry ?? (nt ? 0 : 3), v = t.retryDelay ?? Qr, S = typeof v == "function" ? v(i, k) : v, T = E === !0 || typeof E == "number" && i < E || typeof E == "function" && E(i, k);
      if (e || !T) {
        p(k);
        return;
      }
      i++, t.onFail?.(i, k), Br(S).then(() => d() ? void 0 : m()).then(() => {
        e ? p(k) : _();
      });
    });
  };
  return {
    promise: o,
    status: () => o.status,
    cancel: l,
    continue: () => (r?.(), o),
    cancelRetry: a,
    continueRetry: u,
    canStart: h,
    start: () => (h() ? _() : m().then(_), o)
  };
}
var Gn = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), ai(this.gcTime) && (this.#e = tt.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(t) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      t ?? (nt ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (tt.clearTimeout(this.#e), this.#e = void 0);
  }
}, Kr = class extends Gn {
  #e;
  #t;
  #i;
  #r;
  #n;
  #s;
  #a;
  constructor(t) {
    super(), this.#a = !1, this.#s = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.#r = t.client, this.#i = this.#r.getQueryCache(), this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.#e = Xi(this.options), this.state = t.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(t) {
    if (this.options = { ...this.#s, ...t }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const e = Xi(this.options);
      e.data !== void 0 && (this.setState(
        Yi(e.data, e.dataUpdatedAt)
      ), this.#e = e);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(t, e) {
    const i = ci(this.state.data, t, this.options);
    return this.#o({
      data: i,
      type: "success",
      dataUpdatedAt: e?.updatedAt,
      manual: e?.manual
    }), i;
  }
  setState(t, e) {
    this.#o({ type: "setState", state: t, setStateOptions: e });
  }
  cancel(t) {
    const e = this.#n?.promise;
    return this.#n?.cancel(t), e ? e.then(Ee).catch(Ee) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({ silent: !0 });
  }
  reset() {
    this.destroy(), this.setState(this.#e);
  }
  isActive() {
    return this.observers.some(
      (t) => ze(t.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === wi || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => Ke(t.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => t.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(t = 0) {
    return this.state.data === void 0 ? !0 : t === "static" ? !1 : this.state.isInvalidated ? !0 : !Nn(this.state.dataUpdatedAt, t);
  }
  onFocus() {
    this.observers.find((e) => e.shouldFetchOnWindowFocus())?.refetch({ cancelRefetch: !1 }), this.#n?.continue();
  }
  onOnline() {
    this.observers.find((e) => e.shouldFetchOnReconnect())?.refetch({ cancelRefetch: !1 }), this.#n?.continue();
  }
  addObserver(t) {
    this.observers.includes(t) || (this.observers.push(t), this.clearGcTimeout(), this.#i.notify({ type: "observerAdded", query: this, observer: t }));
  }
  removeObserver(t) {
    this.observers.includes(t) && (this.observers = this.observers.filter((e) => e !== t), this.observers.length || (this.#n && (this.#a ? this.#n.cancel({ revert: !0 }) : this.#n.cancelRetry()), this.scheduleGc()), this.#i.notify({ type: "observerRemoved", query: this, observer: t }));
  }
  getObserversCount() {
    return this.observers.length;
  }
  invalidate() {
    this.state.isInvalidated || this.#o({ type: "invalidate" });
  }
  async fetch(t, e) {
    if (this.state.fetchStatus !== "idle" && // If the promise in the retryer is already rejected, we have to definitely
    // re-start the fetch; there is a chance that the query is still in a
    // pending state when that happens
    this.#n?.status() !== "rejected") {
      if (this.state.data !== void 0 && e?.cancelRefetch)
        this.cancel({ silent: !0 });
      else if (this.#n)
        return this.#n.continueRetry(), this.#n.promise;
    }
    if (t && this.setOptions(t), !this.options.queryFn) {
      const a = this.observers.find((u) => u.options.queryFn);
      a && this.setOptions(a.options);
    }
    const i = new AbortController(), r = (a) => {
      Object.defineProperty(a, "signal", {
        enumerable: !0,
        get: () => (this.#a = !0, i.signal)
      });
    }, o = () => {
      const a = Un(this.options, e), d = (() => {
        const h = {
          client: this.#r,
          queryKey: this.queryKey,
          meta: this.meta
        };
        return r(h), h;
      })();
      return this.#a = !1, this.options.persister ? this.options.persister(
        a,
        d,
        this
      ) : a(d);
    }, l = (() => {
      const a = {
        fetchOptions: e,
        options: this.options,
        queryKey: this.queryKey,
        client: this.#r,
        state: this.state,
        fetchFn: o
      };
      return r(a), a;
    })();
    this.options.behavior?.onFetch(l, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== l.fetchOptions?.meta) && this.#o({ type: "fetch", meta: l.fetchOptions?.meta }), this.#n = Wn({
      initialPromise: e?.initialPromise,
      fn: l.fetchFn,
      onCancel: (a) => {
        a instanceof ui && a.revert && this.setState({
          ...this.#t,
          fetchStatus: "idle"
        }), i.abort();
      },
      onFail: (a, u) => {
        this.#o({ type: "failed", failureCount: a, error: u });
      },
      onPause: () => {
        this.#o({ type: "pause" });
      },
      onContinue: () => {
        this.#o({ type: "continue" });
      },
      retry: l.options.retry,
      retryDelay: l.options.retryDelay,
      networkMode: l.options.networkMode,
      canRun: () => !0
    });
    try {
      const a = await this.#n.start();
      if (a === void 0)
        throw new Error(`${this.queryHash} data is undefined`);
      return this.setData(a), this.#i.config.onSuccess?.(a, this), this.#i.config.onSettled?.(
        a,
        this.state.error,
        this
      ), a;
    } catch (a) {
      if (a instanceof ui) {
        if (a.silent)
          return this.#n.promise;
        if (a.revert) {
          if (this.state.data === void 0)
            throw a;
          return this.state.data;
        }
      }
      throw this.#o({
        type: "error",
        error: a
      }), this.#i.config.onError?.(
        a,
        this
      ), this.#i.config.onSettled?.(
        this.state.data,
        a,
        this
      ), a;
    } finally {
      this.scheduleGc();
    }
  }
  #o(t) {
    const e = (i) => {
      switch (t.type) {
        case "failed":
          return {
            ...i,
            fetchFailureCount: t.failureCount,
            fetchFailureReason: t.error
          };
        case "pause":
          return {
            ...i,
            fetchStatus: "paused"
          };
        case "continue":
          return {
            ...i,
            fetchStatus: "fetching"
          };
        case "fetch":
          return {
            ...i,
            ...$n(i.data, this.options),
            fetchMeta: t.meta ?? null
          };
        case "success":
          const r = {
            ...i,
            ...Yi(t.data, t.dataUpdatedAt),
            dataUpdateCount: i.dataUpdateCount + 1,
            ...!t.manual && {
              fetchStatus: "idle",
              fetchFailureCount: 0,
              fetchFailureReason: null
            }
          };
          return this.#t = t.manual ? r : void 0, r;
        case "error":
          const o = t.error;
          return {
            ...i,
            error: o,
            errorUpdateCount: i.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: i.fetchFailureCount + 1,
            fetchFailureReason: o,
            fetchStatus: "idle",
            status: "error",
            // flag existing data as invalidated if we get a background error
            // note that "no data" always means stale so we can set unconditionally here
            isInvalidated: !0
          };
        case "invalidate":
          return {
            ...i,
            isInvalidated: !0
          };
        case "setState":
          return {
            ...i,
            ...t.state
          };
      }
    };
    this.state = e(this.state), ue.batch(() => {
      this.observers.forEach((i) => {
        i.onQueryUpdate();
      }), this.#i.notify({ query: this, type: "updated", action: t });
    });
  }
};
function $n(t, e) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: Bn(e.networkMode) ? "fetching" : "paused",
    ...t === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function Yi(t, e) {
  return {
    data: t,
    dataUpdatedAt: e ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function Xi(t) {
  const e = typeof t.initialData == "function" ? t.initialData() : t.initialData, i = e !== void 0, r = i ? typeof t.initialDataUpdatedAt == "function" ? t.initialDataUpdatedAt() : t.initialDataUpdatedAt : 0;
  return {
    data: e,
    dataUpdateCount: 0,
    dataUpdatedAt: i ? r ?? Date.now() : 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchMeta: null,
    isInvalidated: !1,
    status: i ? "success" : "pending",
    fetchStatus: "idle"
  };
}
var Yr = class extends at {
  constructor(t, e) {
    super(), this.options = e, this.#e = t, this.#o = null, this.#a = di(), this.bindMethods(), this.setOptions(e);
  }
  #e;
  #t = void 0;
  #i = void 0;
  #r = void 0;
  #n;
  #s;
  #a;
  #o;
  #m;
  #h;
  // This property keeps track of the last query with defined data.
  // It will be used to pass the previous data and query to the placeholder function between renders.
  #p;
  #c;
  #d;
  #l;
  #f = /* @__PURE__ */ new Set();
  bindMethods() {
    this.refetch = this.refetch.bind(this);
  }
  onSubscribe() {
    this.listeners.size === 1 && (this.#t.addObserver(this), Ji(this.#t, this.options) ? this.#u() : this.updateResult(), this.#b());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return hi(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return hi(
      this.#t,
      this.options,
      this.options.refetchOnWindowFocus
    );
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set(), this.#v(), this.#x(), this.#t.removeObserver(this);
  }
  setOptions(t) {
    const e = this.options, i = this.#t;
    if (this.options = this.#e.defaultQueryOptions(t), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof ze(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), e._defaulted && !Bt(this.options, e) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const r = this.hasListeners();
    r && Zi(
      this.#t,
      i,
      this.options,
      e
    ) && this.#u(), this.updateResult(), r && (this.#t !== i || ze(this.options.enabled, this.#t) !== ze(e.enabled, this.#t) || Ke(this.options.staleTime, this.#t) !== Ke(e.staleTime, this.#t)) && this.#g();
    const o = this.#y();
    r && (this.#t !== i || ze(this.options.enabled, this.#t) !== ze(e.enabled, this.#t) || o !== this.#l) && this.#_(o);
  }
  getOptimisticResult(t) {
    const e = this.#e.getQueryCache().build(this.#e, t), i = this.createResult(e, t);
    return Jr(this, i) && (this.#r = i, this.#s = this.options, this.#n = this.#t.state), i;
  }
  getCurrentResult() {
    return this.#r;
  }
  trackResult(t, e) {
    return new Proxy(t, {
      get: (i, r) => (this.trackProp(r), e?.(r), r === "promise" && (this.trackProp("data"), !this.options.experimental_prefetchInRender && this.#a.status === "pending" && this.#a.reject(
        new Error(
          "experimental_prefetchInRender feature flag is not enabled"
        )
      )), Reflect.get(i, r))
    });
  }
  trackProp(t) {
    this.#f.add(t);
  }
  getCurrentQuery() {
    return this.#t;
  }
  refetch({ ...t } = {}) {
    return this.fetch({
      ...t
    });
  }
  fetchOptimistic(t) {
    const e = this.#e.defaultQueryOptions(t), i = this.#e.getQueryCache().build(this.#e, e);
    return i.fetch().then(() => this.createResult(i, e));
  }
  fetch(t) {
    return this.#u({
      ...t,
      cancelRefetch: t.cancelRefetch ?? !0
    }).then(() => (this.updateResult(), this.#r));
  }
  #u(t) {
    this.#S();
    let e = this.#t.fetch(
      this.options,
      t
    );
    return t?.throwOnError || (e = e.catch(Ee)), e;
  }
  #g() {
    this.#v();
    const t = Ke(
      this.options.staleTime,
      this.#t
    );
    if (nt || this.#r.isStale || !ai(t))
      return;
    const i = Nn(this.#r.dataUpdatedAt, t) + 1;
    this.#c = tt.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(t) {
    this.#x(), this.#l = t, !(nt || ze(this.options.enabled, this.#t) === !1 || !ai(this.#l) || this.#l === 0) && (this.#d = tt.setInterval(() => {
      (this.options.refetchIntervalInBackground || Ei.isFocused()) && this.#u();
    }, this.#l));
  }
  #b() {
    this.#g(), this.#_(this.#y());
  }
  #v() {
    this.#c && (tt.clearTimeout(this.#c), this.#c = void 0);
  }
  #x() {
    this.#d && (tt.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(t, e) {
    const i = this.#t, r = this.options, o = this.#r, s = this.#n, l = this.#s, u = t !== i ? t.state : this.#i, { state: d } = t;
    let h = { ...d }, c = !1, p;
    if (e._optimisticResults) {
      const U = this.hasListeners(), q = !U && Ji(t, e), Z = U && Zi(t, i, e, r);
      (q || Z) && (h = {
        ...h,
        ...$n(d.data, t.options)
      }), e._optimisticResults === "isRestoring" && (h.fetchStatus = "idle");
    }
    let { error: m, errorUpdatedAt: _, status: x } = h;
    p = h.data;
    let I = !1;
    if (e.placeholderData !== void 0 && p === void 0 && x === "pending") {
      let U;
      o?.isPlaceholderData && e.placeholderData === l?.placeholderData ? (U = o.data, I = !0) : U = typeof e.placeholderData == "function" ? e.placeholderData(
        this.#p?.state.data,
        this.#p
      ) : e.placeholderData, U !== void 0 && (x = "success", p = ci(
        o?.data,
        U,
        e
      ), c = !0);
    }
    if (e.select && p !== void 0 && !I)
      if (o && p === s?.data && e.select === this.#m)
        p = this.#h;
      else
        try {
          this.#m = e.select, p = e.select(p), p = ci(o?.data, p, e), this.#h = p, this.#o = null;
        } catch (U) {
          this.#o = U;
        }
    this.#o && (m = this.#o, p = this.#h, _ = Date.now(), x = "error");
    const k = h.fetchStatus === "fetching", E = x === "pending", v = x === "error", S = E && k, T = p !== void 0, P = {
      status: x,
      fetchStatus: h.fetchStatus,
      isPending: E,
      isSuccess: x === "success",
      isError: v,
      isInitialLoading: S,
      isLoading: S,
      data: p,
      dataUpdatedAt: h.dataUpdatedAt,
      error: m,
      errorUpdatedAt: _,
      failureCount: h.fetchFailureCount,
      failureReason: h.fetchFailureReason,
      errorUpdateCount: h.errorUpdateCount,
      isFetched: h.dataUpdateCount > 0 || h.errorUpdateCount > 0,
      isFetchedAfterMount: h.dataUpdateCount > u.dataUpdateCount || h.errorUpdateCount > u.errorUpdateCount,
      isFetching: k,
      isRefetching: k && !E,
      isLoadingError: v && !T,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: c,
      isRefetchError: v && T,
      isStale: ki(t, e),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: ze(e.enabled, t) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const U = P.data !== void 0, q = P.status === "error" && !U, Z = (X) => {
        q ? X.reject(P.error) : U && X.resolve(P.data);
      }, N = () => {
        const X = this.#a = P.promise = di();
        Z(X);
      }, Q = this.#a;
      switch (Q.status) {
        case "pending":
          t.queryHash === i.queryHash && Z(Q);
          break;
        case "fulfilled":
          (q || P.data !== Q.value) && N();
          break;
        case "rejected":
          (!q || P.error !== Q.reason) && N();
          break;
      }
    }
    return P;
  }
  updateResult() {
    const t = this.#r, e = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#s = this.options, this.#n.data !== void 0 && (this.#p = this.#t), Bt(e, t))
      return;
    this.#r = e;
    const i = () => {
      if (!t)
        return !0;
      const { notifyOnChangeProps: r } = this.options, o = typeof r == "function" ? r() : r;
      if (o === "all" || !o && !this.#f.size)
        return !0;
      const s = new Set(
        o ?? this.#f
      );
      return this.options.throwOnError && s.add("error"), Object.keys(this.#r).some((l) => {
        const a = l;
        return this.#r[a] !== t[a] && s.has(a);
      });
    };
    this.#w({ listeners: i() });
  }
  #S() {
    const t = this.#e.getQueryCache().build(this.#e, this.options);
    if (t === this.#t)
      return;
    const e = this.#t;
    this.#t = t, this.#i = t.state, this.hasListeners() && (e?.removeObserver(this), t.addObserver(this));
  }
  onQueryUpdate() {
    this.updateResult(), this.hasListeners() && this.#b();
  }
  #w(t) {
    ue.batch(() => {
      t.listeners && this.listeners.forEach((e) => {
        e(this.#r);
      }), this.#e.getQueryCache().notify({
        query: this.#t,
        type: "observerResultsUpdated"
      });
    });
  }
};
function Xr(t, e) {
  return ze(e.enabled, t) !== !1 && t.state.data === void 0 && !(t.state.status === "error" && e.retryOnMount === !1);
}
function Ji(t, e) {
  return Xr(t, e) || t.state.data !== void 0 && hi(t, e, e.refetchOnMount);
}
function hi(t, e, i) {
  if (ze(e.enabled, t) !== !1 && Ke(e.staleTime, t) !== "static") {
    const r = typeof i == "function" ? i(t) : i;
    return r === "always" || r !== !1 && ki(t, e);
  }
  return !1;
}
function Zi(t, e, i, r) {
  return (t !== e || ze(r.enabled, t) === !1) && (!i.suspense || t.state.status !== "error") && ki(t, i);
}
function ki(t, e) {
  return ze(e.enabled, t) !== !1 && t.isStaleByTime(Ke(e.staleTime, t));
}
function Jr(t, e) {
  return !Bt(t.getCurrentResult(), e);
}
function en(t) {
  return {
    onFetch: (e, i) => {
      const r = e.options, o = e.fetchOptions?.meta?.fetchMore?.direction, s = e.state.data?.pages || [], l = e.state.data?.pageParams || [];
      let a = { pages: [], pageParams: [] }, u = 0;
      const d = async () => {
        let h = !1;
        const c = (_) => {
          $r(
            _,
            () => e.signal,
            () => h = !0
          );
        }, p = Un(e.options, e.fetchOptions), m = async (_, x, I) => {
          if (h)
            return Promise.reject();
          if (x == null && _.pages.length)
            return Promise.resolve(_);
          const E = (() => {
            const F = {
              client: e.client,
              queryKey: e.queryKey,
              pageParam: x,
              direction: I ? "backward" : "forward",
              meta: e.options.meta
            };
            return c(F), F;
          })(), v = await p(E), { maxPages: S } = e.options, T = I ? Gr : Wr;
          return {
            pages: T(_.pages, v, S),
            pageParams: T(_.pageParams, x, S)
          };
        };
        if (o && s.length) {
          const _ = o === "backward", x = _ ? Zr : tn, I = {
            pages: s,
            pageParams: l
          }, k = x(r, I);
          a = await m(I, k, _);
        } else {
          const _ = t ?? s.length;
          do {
            const x = u === 0 ? l[0] ?? r.initialPageParam : tn(r, a);
            if (u > 0 && x == null)
              break;
            a = await m(a, x), u++;
          } while (u < _);
        }
        return a;
      };
      e.options.persister ? e.fetchFn = () => e.options.persister?.(
        d,
        {
          client: e.client,
          queryKey: e.queryKey,
          meta: e.options.meta,
          signal: e.signal
        },
        i
      ) : e.fetchFn = d;
    }
  };
}
function tn(t, { pages: e, pageParams: i }) {
  const r = e.length - 1;
  return e.length > 0 ? t.getNextPageParam(
    e[r],
    e,
    i[r],
    i
  ) : void 0;
}
function Zr(t, { pages: e, pageParams: i }) {
  return e.length > 0 ? t.getPreviousPageParam?.(e[0], e, i[0], i) : void 0;
}
var eo = class extends Gn {
  #e;
  #t;
  #i;
  #r;
  constructor(t) {
    super(), this.#e = t.client, this.mutationId = t.mutationId, this.#i = t.mutationCache, this.#t = [], this.state = t.state || Hn(), this.setOptions(t.options), this.scheduleGc();
  }
  setOptions(t) {
    this.options = t, this.updateGcTime(this.options.gcTime);
  }
  get meta() {
    return this.options.meta;
  }
  addObserver(t) {
    this.#t.includes(t) || (this.#t.push(t), this.clearGcTimeout(), this.#i.notify({
      type: "observerAdded",
      mutation: this,
      observer: t
    }));
  }
  removeObserver(t) {
    this.#t = this.#t.filter((e) => e !== t), this.scheduleGc(), this.#i.notify({
      type: "observerRemoved",
      mutation: this,
      observer: t
    });
  }
  optionalRemove() {
    this.#t.length || (this.state.status === "pending" ? this.scheduleGc() : this.#i.remove(this));
  }
  continue() {
    return this.#r?.continue() ?? // continuing a mutation assumes that variables are set, mutation must have been dehydrated before
    this.execute(this.state.variables);
  }
  async execute(t) {
    const e = () => {
      this.#n({ type: "continue" });
    }, i = {
      client: this.#e,
      meta: this.options.meta,
      mutationKey: this.options.mutationKey
    };
    this.#r = Wn({
      fn: () => this.options.mutationFn ? this.options.mutationFn(t, i) : Promise.reject(new Error("No mutationFn found")),
      onFail: (s, l) => {
        this.#n({ type: "failed", failureCount: s, error: l });
      },
      onPause: () => {
        this.#n({ type: "pause" });
      },
      onContinue: e,
      retry: this.options.retry ?? 0,
      retryDelay: this.options.retryDelay,
      networkMode: this.options.networkMode,
      canRun: () => this.#i.canRun(this)
    });
    const r = this.state.status === "pending", o = !this.#r.canStart();
    try {
      if (r)
        e();
      else {
        this.#n({ type: "pending", variables: t, isPaused: o }), this.#i.config.onMutate && await this.#i.config.onMutate(
          t,
          this,
          i
        );
        const l = await this.options.onMutate?.(
          t,
          i
        );
        l !== this.state.context && this.#n({
          type: "pending",
          context: l,
          variables: t,
          isPaused: o
        });
      }
      const s = await this.#r.start();
      return await this.#i.config.onSuccess?.(
        s,
        t,
        this.state.context,
        this,
        i
      ), await this.options.onSuccess?.(
        s,
        t,
        this.state.context,
        i
      ), await this.#i.config.onSettled?.(
        s,
        null,
        this.state.variables,
        this.state.context,
        this,
        i
      ), await this.options.onSettled?.(
        s,
        null,
        t,
        this.state.context,
        i
      ), this.#n({ type: "success", data: s }), s;
    } catch (s) {
      try {
        await this.#i.config.onError?.(
          s,
          t,
          this.state.context,
          this,
          i
        );
      } catch (l) {
        Promise.reject(l);
      }
      try {
        await this.options.onError?.(
          s,
          t,
          this.state.context,
          i
        );
      } catch (l) {
        Promise.reject(l);
      }
      try {
        await this.#i.config.onSettled?.(
          void 0,
          s,
          this.state.variables,
          this.state.context,
          this,
          i
        );
      } catch (l) {
        Promise.reject(l);
      }
      try {
        await this.options.onSettled?.(
          void 0,
          s,
          t,
          this.state.context,
          i
        );
      } catch (l) {
        Promise.reject(l);
      }
      throw this.#n({ type: "error", error: s }), s;
    } finally {
      this.#i.runNext(this);
    }
  }
  #n(t) {
    const e = (i) => {
      switch (t.type) {
        case "failed":
          return {
            ...i,
            failureCount: t.failureCount,
            failureReason: t.error
          };
        case "pause":
          return {
            ...i,
            isPaused: !0
          };
        case "continue":
          return {
            ...i,
            isPaused: !1
          };
        case "pending":
          return {
            ...i,
            context: t.context,
            data: void 0,
            failureCount: 0,
            failureReason: null,
            error: null,
            isPaused: t.isPaused,
            status: "pending",
            variables: t.variables,
            submittedAt: Date.now()
          };
        case "success":
          return {
            ...i,
            data: t.data,
            failureCount: 0,
            failureReason: null,
            error: null,
            status: "success",
            isPaused: !1
          };
        case "error":
          return {
            ...i,
            data: void 0,
            error: t.error,
            failureCount: i.failureCount + 1,
            failureReason: t.error,
            isPaused: !1,
            status: "error"
          };
      }
    };
    this.state = e(this.state), ue.batch(() => {
      this.#t.forEach((i) => {
        i.onMutationUpdate(t);
      }), this.#i.notify({
        mutation: this,
        type: "updated",
        action: t
      });
    });
  }
};
function Hn() {
  return {
    context: void 0,
    data: void 0,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: !1,
    status: "idle",
    variables: void 0,
    submittedAt: 0
  };
}
var to = class extends at {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(t, e, i) {
    const r = new eo({
      client: t,
      mutationCache: this,
      mutationId: ++this.#i,
      options: t.defaultMutationOptions(e),
      state: i
    });
    return this.add(r), r;
  }
  add(t) {
    this.#e.add(t);
    const e = Ct(t);
    if (typeof e == "string") {
      const i = this.#t.get(e);
      i ? i.push(t) : this.#t.set(e, [t]);
    }
    this.notify({ type: "added", mutation: t });
  }
  remove(t) {
    if (this.#e.delete(t)) {
      const e = Ct(t);
      if (typeof e == "string") {
        const i = this.#t.get(e);
        if (i)
          if (i.length > 1) {
            const r = i.indexOf(t);
            r !== -1 && i.splice(r, 1);
          } else i[0] === t && this.#t.delete(e);
      }
    }
    this.notify({ type: "removed", mutation: t });
  }
  canRun(t) {
    const e = Ct(t);
    if (typeof e == "string") {
      const r = this.#t.get(e)?.find(
        (o) => o.state.status === "pending"
      );
      return !r || r === t;
    } else
      return !0;
  }
  runNext(t) {
    const e = Ct(t);
    return typeof e == "string" ? this.#t.get(e)?.find((r) => r !== t && r.state.isPaused)?.continue() ?? Promise.resolve() : Promise.resolve();
  }
  clear() {
    ue.batch(() => {
      this.#e.forEach((t) => {
        this.notify({ type: "removed", mutation: t });
      }), this.#e.clear(), this.#t.clear();
    });
  }
  getAll() {
    return Array.from(this.#e);
  }
  find(t) {
    const e = { exact: !0, ...t };
    return this.getAll().find(
      (i) => ji(e, i)
    );
  }
  findAll(t = {}) {
    return this.getAll().filter((e) => ji(t, e));
  }
  notify(t) {
    ue.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  resumePausedMutations() {
    const t = this.getAll().filter((e) => e.state.isPaused);
    return ue.batch(
      () => Promise.all(
        t.map((e) => e.continue().catch(Ee))
      )
    );
  }
};
function Ct(t) {
  return t.options.scope?.id;
}
var io = class extends at {
  #e;
  #t = void 0;
  #i;
  #r;
  constructor(e, i) {
    super(), this.#e = e, this.setOptions(i), this.bindMethods(), this.#n();
  }
  bindMethods() {
    this.mutate = this.mutate.bind(this), this.reset = this.reset.bind(this);
  }
  setOptions(e) {
    const i = this.options;
    this.options = this.#e.defaultMutationOptions(e), Bt(this.options, i) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), i?.mutationKey && this.options.mutationKey && rt(i.mutationKey) !== rt(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
  }
  onUnsubscribe() {
    this.hasListeners() || this.#i?.removeObserver(this);
  }
  onMutationUpdate(e) {
    this.#n(), this.#s(e);
  }
  getCurrentResult() {
    return this.#t;
  }
  reset() {
    this.#i?.removeObserver(this), this.#i = void 0, this.#n(), this.#s();
  }
  mutate(e, i) {
    return this.#r = i, this.#i?.removeObserver(this), this.#i = this.#e.getMutationCache().build(this.#e, this.options), this.#i.addObserver(this), this.#i.execute(e);
  }
  #n() {
    const e = this.#i?.state ?? Hn();
    this.#t = {
      ...e,
      isPending: e.status === "pending",
      isSuccess: e.status === "success",
      isError: e.status === "error",
      isIdle: e.status === "idle",
      mutate: this.mutate,
      reset: this.reset
    };
  }
  #s(e) {
    ue.batch(() => {
      if (this.#r && this.hasListeners()) {
        const i = this.#t.variables, r = this.#t.context, o = {
          client: this.#e,
          meta: this.options.meta,
          mutationKey: this.options.mutationKey
        };
        if (e?.type === "success") {
          try {
            this.#r.onSuccess?.(
              e.data,
              i,
              r,
              o
            );
          } catch (s) {
            Promise.reject(s);
          }
          try {
            this.#r.onSettled?.(
              e.data,
              null,
              i,
              r,
              o
            );
          } catch (s) {
            Promise.reject(s);
          }
        } else if (e?.type === "error") {
          try {
            this.#r.onError?.(
              e.error,
              i,
              r,
              o
            );
          } catch (s) {
            Promise.reject(s);
          }
          try {
            this.#r.onSettled?.(
              void 0,
              e.error,
              i,
              r,
              o
            );
          } catch (s) {
            Promise.reject(s);
          }
        }
      }
      this.listeners.forEach((i) => {
        i(this.#t);
      });
    });
  }
}, no = class extends at {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(t, e, i) {
    const r = e.queryKey, o = e.queryHash ?? Si(r, e);
    let s = this.get(o);
    return s || (s = new Kr({
      client: t,
      queryKey: r,
      queryHash: o,
      options: t.defaultQueryOptions(e),
      state: i,
      defaultOptions: t.getQueryDefaults(r)
    }), this.add(s)), s;
  }
  add(t) {
    this.#e.has(t.queryHash) || (this.#e.set(t.queryHash, t), this.notify({
      type: "added",
      query: t
    }));
  }
  remove(t) {
    const e = this.#e.get(t.queryHash);
    e && (t.destroy(), e === t && this.#e.delete(t.queryHash), this.notify({ type: "removed", query: t }));
  }
  clear() {
    ue.batch(() => {
      this.getAll().forEach((t) => {
        this.remove(t);
      });
    });
  }
  get(t) {
    return this.#e.get(t);
  }
  getAll() {
    return [...this.#e.values()];
  }
  find(t) {
    const e = { exact: !0, ...t };
    return this.getAll().find(
      (i) => Vi(e, i)
    );
  }
  findAll(t = {}) {
    const e = this.getAll();
    return Object.keys(t).length > 0 ? e.filter((i) => Vi(t, i)) : e;
  }
  notify(t) {
    ue.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  onFocus() {
    ue.batch(() => {
      this.getAll().forEach((t) => {
        t.onFocus();
      });
    });
  }
  onOnline() {
    ue.batch(() => {
      this.getAll().forEach((t) => {
        t.onOnline();
      });
    });
  }
}, ro = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #s;
  #a;
  #o;
  constructor(t = {}) {
    this.#e = t.queryCache || new no(), this.#t = t.mutationCache || new to(), this.#i = t.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#s = 0;
  }
  mount() {
    this.#s++, this.#s === 1 && (this.#a = Ei.subscribe(async (t) => {
      t && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#o = Wt.subscribe(async (t) => {
      t && (await this.resumePausedMutations(), this.#e.onOnline());
    }));
  }
  unmount() {
    this.#s--, this.#s === 0 && (this.#a?.(), this.#a = void 0, this.#o?.(), this.#o = void 0);
  }
  isFetching(t) {
    return this.#e.findAll({ ...t, fetchStatus: "fetching" }).length;
  }
  isMutating(t) {
    return this.#t.findAll({ ...t, status: "pending" }).length;
  }
  /**
   * Imperative (non-reactive) way to retrieve data for a QueryKey.
   * Should only be used in callbacks or functions where reading the latest data is necessary, e.g. for optimistic updates.
   *
   * Hint: Do not use this function inside a component, because it won't receive updates.
   * Use `useQuery` to create a `QueryObserver` that subscribes to changes.
   */
  getQueryData(t) {
    const e = this.defaultQueryOptions({ queryKey: t });
    return this.#e.get(e.queryHash)?.state.data;
  }
  ensureQueryData(t) {
    const e = this.defaultQueryOptions(t), i = this.#e.build(this, e), r = i.state.data;
    return r === void 0 ? this.fetchQuery(t) : (t.revalidateIfStale && i.isStaleByTime(Ke(e.staleTime, i)) && this.prefetchQuery(e), Promise.resolve(r));
  }
  getQueriesData(t) {
    return this.#e.findAll(t).map(({ queryKey: e, state: i }) => {
      const r = i.data;
      return [e, r];
    });
  }
  setQueryData(t, e, i) {
    const r = this.defaultQueryOptions({ queryKey: t }), s = this.#e.get(
      r.queryHash
    )?.state.data, l = Mr(e, s);
    if (l !== void 0)
      return this.#e.build(this, r).setData(l, { ...i, manual: !0 });
  }
  setQueriesData(t, e, i) {
    return ue.batch(
      () => this.#e.findAll(t).map(({ queryKey: r }) => [
        r,
        this.setQueryData(r, e, i)
      ])
    );
  }
  getQueryState(t) {
    const e = this.defaultQueryOptions({ queryKey: t });
    return this.#e.get(
      e.queryHash
    )?.state;
  }
  removeQueries(t) {
    const e = this.#e;
    ue.batch(() => {
      e.findAll(t).forEach((i) => {
        e.remove(i);
      });
    });
  }
  resetQueries(t, e) {
    const i = this.#e;
    return ue.batch(() => (i.findAll(t).forEach((r) => {
      r.reset();
    }), this.refetchQueries(
      {
        type: "active",
        ...t
      },
      e
    )));
  }
  cancelQueries(t, e = {}) {
    const i = { revert: !0, ...e }, r = ue.batch(
      () => this.#e.findAll(t).map((o) => o.cancel(i))
    );
    return Promise.all(r).then(Ee).catch(Ee);
  }
  invalidateQueries(t, e = {}) {
    return ue.batch(() => (this.#e.findAll(t).forEach((i) => {
      i.invalidate();
    }), t?.refetchType === "none" ? Promise.resolve() : this.refetchQueries(
      {
        ...t,
        type: t?.refetchType ?? t?.type ?? "active"
      },
      e
    )));
  }
  refetchQueries(t, e = {}) {
    const i = {
      ...e,
      cancelRefetch: e.cancelRefetch ?? !0
    }, r = ue.batch(
      () => this.#e.findAll(t).filter((o) => !o.isDisabled() && !o.isStatic()).map((o) => {
        let s = o.fetch(void 0, i);
        return i.throwOnError || (s = s.catch(Ee)), o.state.fetchStatus === "paused" ? Promise.resolve() : s;
      })
    );
    return Promise.all(r).then(Ee);
  }
  fetchQuery(t) {
    const e = this.defaultQueryOptions(t);
    e.retry === void 0 && (e.retry = !1);
    const i = this.#e.build(this, e);
    return i.isStaleByTime(
      Ke(e.staleTime, i)
    ) ? i.fetch(e) : Promise.resolve(i.state.data);
  }
  prefetchQuery(t) {
    return this.fetchQuery(t).then(Ee).catch(Ee);
  }
  fetchInfiniteQuery(t) {
    return t.behavior = en(t.pages), this.fetchQuery(t);
  }
  prefetchInfiniteQuery(t) {
    return this.fetchInfiniteQuery(t).then(Ee).catch(Ee);
  }
  ensureInfiniteQueryData(t) {
    return t.behavior = en(t.pages), this.ensureQueryData(t);
  }
  resumePausedMutations() {
    return Wt.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
  }
  getQueryCache() {
    return this.#e;
  }
  getMutationCache() {
    return this.#t;
  }
  getDefaultOptions() {
    return this.#i;
  }
  setDefaultOptions(t) {
    this.#i = t;
  }
  setQueryDefaults(t, e) {
    this.#r.set(rt(t), {
      queryKey: t,
      defaultOptions: e
    });
  }
  getQueryDefaults(t) {
    const e = [...this.#r.values()], i = {};
    return e.forEach((r) => {
      _t(t, r.queryKey) && Object.assign(i, r.defaultOptions);
    }), i;
  }
  setMutationDefaults(t, e) {
    this.#n.set(rt(t), {
      mutationKey: t,
      defaultOptions: e
    });
  }
  getMutationDefaults(t) {
    const e = [...this.#n.values()], i = {};
    return e.forEach((r) => {
      _t(t, r.mutationKey) && Object.assign(i, r.defaultOptions);
    }), i;
  }
  defaultQueryOptions(t) {
    if (t._defaulted)
      return t;
    const e = {
      ...this.#i.queries,
      ...this.getQueryDefaults(t.queryKey),
      ...t,
      _defaulted: !0
    };
    return e.queryHash || (e.queryHash = Si(
      e.queryKey,
      e
    )), e.refetchOnReconnect === void 0 && (e.refetchOnReconnect = e.networkMode !== "always"), e.throwOnError === void 0 && (e.throwOnError = !!e.suspense), !e.networkMode && e.persister && (e.networkMode = "offlineFirst"), e.queryFn === wi && (e.enabled = !1), e;
  }
  defaultMutationOptions(t) {
    return t?._defaulted ? t : {
      ...this.#i.mutations,
      ...t?.mutationKey && this.getMutationDefaults(t.mutationKey),
      ...t,
      _defaulted: !0
    };
  }
  clear() {
    this.#e.clear(), this.#t.clear();
  }
};
function oo(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function nn(t, e) {
  for (var i in t) if (i !== "__source" && !(i in e)) return !0;
  for (var r in e) if (r !== "__source" && t[r] !== e[r]) return !0;
  return !1;
}
function qn(t, e) {
  var i = e(), r = b({ t: { __: i, u: e } }), o = r[0].t, s = r[1];
  return br(function() {
    o.__ = i, o.u = e, jt(o) && s({ t: o });
  }, [t, i, e]), pe(function() {
    return jt(o) && s({ t: o }), t(function() {
      jt(o) && s({ t: o });
    });
  }, [t]), i;
}
function jt(t) {
  var e, i, r = t.u, o = t.__;
  try {
    var s = r();
    return !((e = o) === (i = s) && (e !== 0 || 1 / e == 1 / i) || e != e && i != i);
  } catch {
    return !0;
  }
}
function rn(t, e) {
  this.props = t, this.context = e;
}
(rn.prototype = new We()).isPureReactComponent = !0, rn.prototype.shouldComponentUpdate = function(t, e) {
  return nn(this.props, t) || nn(this.state, e);
};
var on = B.__b;
B.__b = function(t) {
  t.type && t.type.__f && t.ref && (t.props.ref = t.ref, t.ref = null), on && on(t);
};
var so = B.__e;
B.__e = function(t, e, i, r) {
  if (t.then) {
    for (var o, s = e; s = s.__; ) if ((o = s.__c) && o.__c) return e.__e == null && (e.__e = i.__e, e.__k = i.__k), o.__c(t, e);
  }
  so(t, e, i, r);
};
var sn = B.unmount;
function Vn(t, e, i) {
  return t && (t.__c && t.__c.__H && (t.__c.__H.__.forEach(function(r) {
    typeof r.__c == "function" && r.__c();
  }), t.__c.__H = null), (t = oo({}, t)).__c != null && (t.__c.__P === i && (t.__c.__P = e), t.__c.__e = !0, t.__c = null), t.__k = t.__k && t.__k.map(function(r) {
    return Vn(r, e, i);
  })), t;
}
function jn(t, e, i) {
  return t && i && (t.__v = null, t.__k = t.__k && t.__k.map(function(r) {
    return jn(r, e, i);
  }), t.__c && t.__c.__P === e && (t.__e && i.appendChild(t.__e), t.__c.__e = !0, t.__c.__P = i)), t;
}
function Qt() {
  this.__u = 0, this.o = null, this.__b = null;
}
function Qn(t) {
  if (!t.__) return null;
  var e = t.__.__c;
  return e && e.__a && e.__a(t);
}
function Et() {
  this.i = null, this.l = null;
}
B.unmount = function(t) {
  var e = t.__c;
  e && (e.__z = !0), e && e.__R && e.__R(), e && 32 & t.__u && (t.type = null), sn && sn(t);
}, (Qt.prototype = new We()).__c = function(t, e) {
  var i = e.__c, r = this;
  r.o == null && (r.o = []), r.o.push(i);
  var o = Qn(r.__v), s = !1, l = function() {
    s || r.__z || (s = !0, i.__R = null, o ? o(u) : u());
  };
  i.__R = l;
  var a = i.__P;
  i.__P = null;
  var u = function() {
    if (!--r.__u) {
      if (r.state.__a) {
        var d = r.state.__a;
        r.__v.__k[0] = jn(d, d.__c.__P, d.__c.__O);
      }
      var h;
      for (r.setState({ __a: r.__b = null }); h = r.o.pop(); ) h.__P = a, h.forceUpdate();
    }
  };
  r.__u++ || 32 & e.__u || r.setState({ __a: r.__b = r.__v.__k[0] }), t.then(l, l);
}, Qt.prototype.componentWillUnmount = function() {
  this.o = [];
}, Qt.prototype.render = function(t, e) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), r = this.__v.__k[0].__c;
      this.__v.__k[0] = Vn(this.__b, i, r.__O = r.__P);
    }
    this.__b = null;
  }
  var o = e.__a && ni(ee, null, t.fallback);
  return o && (o.__u &= -33), [ni(ee, null, e.__a ? null : t.children), o];
};
var an = function(t, e, i) {
  if (++i[1] === i[0] && t.l.delete(e), t.props.revealOrder && (t.props.revealOrder[0] !== "t" || !t.l.size)) for (i = t.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    t.i = i = i[2];
  }
};
(Et.prototype = new We()).__a = function(t) {
  var e = this, i = Qn(e.__v), r = e.l.get(t);
  return r[0]++, function(o) {
    var s = function() {
      e.props.revealOrder ? (r.push(o), an(e, t, r)) : o();
    };
    i ? i(s) : s();
  };
}, Et.prototype.render = function(t) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var e = Ut(t.children);
  t.revealOrder && t.revealOrder[0] === "b" && e.reverse();
  for (var i = e.length; i--; ) this.l.set(e[i], this.i = [1, 0, this.i]);
  return t.children;
}, Et.prototype.componentDidUpdate = Et.prototype.componentDidMount = function() {
  var t = this;
  this.l.forEach(function(e, i) {
    an(t, i, e);
  });
};
var ao = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, lo = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, co = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, uo = /[A-Z0-9]/g, ho = typeof document < "u", po = function(t) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(t);
};
We.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t) {
  Object.defineProperty(We.prototype, t, { configurable: !0, get: function() {
    return this["UNSAFE_" + t];
  }, set: function(e) {
    Object.defineProperty(this, t, { configurable: !0, writable: !0, value: e });
  } });
});
var ln = B.event;
function fo() {
}
function mo() {
  return this.cancelBubble;
}
function go() {
  return this.defaultPrevented;
}
B.event = function(t) {
  return ln && (t = ln(t)), t.persist = fo, t.isPropagationStopped = mo, t.isDefaultPrevented = go, t.nativeEvent = t;
};
var yo = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, cn = B.vnode;
B.vnode = function(t) {
  typeof t.type == "string" && (function(e) {
    var i = e.props, r = e.type, o = {}, s = r.indexOf("-") === -1;
    for (var l in i) {
      var a = i[l];
      if (!(l === "value" && "defaultValue" in i && a == null || ho && l === "children" && r === "noscript" || l === "class" || l === "className")) {
        var u = l.toLowerCase();
        l === "defaultValue" && "value" in i && i.value == null ? l = "value" : l === "download" && a === !0 ? a = "" : u === "translate" && a === "no" ? a = !1 : u[0] === "o" && u[1] === "n" ? u === "ondoubleclick" ? l = "ondblclick" : u !== "onchange" || r !== "input" && r !== "textarea" || po(i.type) ? u === "onfocus" ? l = "onfocusin" : u === "onblur" ? l = "onfocusout" : co.test(l) && (l = u) : u = l = "oninput" : s && lo.test(l) ? l = l.replace(uo, "-$&").toLowerCase() : a === null && (a = void 0), u === "oninput" && o[l = u] && (l = "oninputCapture"), o[l] = a;
      }
    }
    r == "select" && o.multiple && Array.isArray(o.value) && (o.value = Ut(i.children).forEach(function(d) {
      d.props.selected = o.value.indexOf(d.props.value) != -1;
    })), r == "select" && o.defaultValue != null && (o.value = Ut(i.children).forEach(function(d) {
      d.props.selected = o.multiple ? o.defaultValue.indexOf(d.props.value) != -1 : o.defaultValue == d.props.value;
    })), i.class && !i.className ? (o.class = i.class, Object.defineProperty(o, "className", yo)) : (i.className && !i.class || i.class && i.className) && (o.class = o.className = i.className), e.props = o;
  })(t), t.$$typeof = ao, cn && cn(t);
};
var dn = B.__r;
B.__r = function(t) {
  dn && dn(t), t.__c;
};
var un = B.diffed;
B.diffed = function(t) {
  un && un(t);
  var e = t.props, i = t.__e;
  i != null && t.type === "textarea" && "value" in e && e.value !== i.value && (i.value = e.value == null ? "" : e.value);
};
var Kn = bi(
  void 0
), xt = (t) => {
  const e = vi(Kn);
  if (!e)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return e;
}, _o = ({
  client: t,
  children: e
}) => (pe(() => (t.mount(), () => {
  t.unmount();
}), [t]), /* @__PURE__ */ n(Kn.Provider, { value: t, children: e })), Yn = bi(!1), bo = () => vi(Yn);
Yn.Provider;
function vo() {
  let t = !1;
  return {
    clearReset: () => {
      t = !1;
    },
    reset: () => {
      t = !0;
    },
    isReset: () => t
  };
}
var xo = bi(vo()), So = () => vi(xo), wo = (t, e, i) => {
  const r = i?.state.error && typeof t.throwOnError == "function" ? Ci(t.throwOnError, [i.state.error, i]) : t.throwOnError;
  (t.suspense || t.experimental_prefetchInRender || r) && (e.isReset() || (t.retryOnMount = !1));
}, Co = (t) => {
  pe(() => {
    t.clearReset();
  }, [t]);
}, Eo = ({
  result: t,
  errorResetBoundary: e,
  throwOnError: i,
  query: r,
  suspense: o
}) => t.isError && !e.isReset() && !t.isFetching && r && (o && t.data === void 0 || Ci(i, [t.error, r])), ko = (t) => {
  if (t.suspense) {
    const i = (o) => o === "static" ? o : Math.max(o ?? 1e3, 1e3), r = t.staleTime;
    t.staleTime = typeof r == "function" ? (...o) => i(r(...o)) : i(r), typeof t.gcTime == "number" && (t.gcTime = Math.max(
      t.gcTime,
      1e3
    ));
  }
}, Io = (t, e) => t.isLoading && t.isFetching && !e, To = (t, e) => t?.suspense && e.isPending, hn = (t, e, i) => e.fetchOptimistic(t).catch(() => {
  i.clearReset();
});
function Ro(t, e, i) {
  const r = bo(), o = So(), s = xt(), l = s.defaultQueryOptions(t);
  s.getDefaultOptions().queries?._experimental_beforeQuery?.(
    l
  );
  const a = s.getQueryCache().get(l.queryHash);
  l._optimisticResults = r ? "isRestoring" : "optimistic", ko(l), wo(l, o, a), Co(o);
  const u = !s.getQueryCache().get(l.queryHash), [d] = b(
    () => new e(
      s,
      l
    )
  ), h = d.getOptimisticResult(l), c = !r && t.subscribed !== !1;
  if (qn(
    De(
      (p) => {
        const m = c ? d.subscribe(ue.batchCalls(p)) : Ee;
        return d.updateResult(), m;
      },
      [d, c]
    ),
    () => d.getCurrentResult()
  ), pe(() => {
    d.setOptions(l);
  }, [l, d]), To(l, h))
    throw hn(l, d, o);
  if (Eo({
    result: h,
    errorResetBoundary: o,
    throwOnError: l.throwOnError,
    query: a,
    suspense: l.suspense
  }))
    throw h.error;
  return s.getDefaultOptions().queries?._experimental_afterQuery?.(
    l,
    h
  ), l.experimental_prefetchInRender && !nt && Io(h, r) && (u ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    hn(l, d, o)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    a?.promise
  ))?.catch(Ee).finally(() => {
    d.updateResult();
  }), l.notifyOnChangeProps ? h : d.trackResult(h);
}
function Ht(t, e) {
  return Ro(t, Yr);
}
function ot(t, e) {
  const i = xt(), [r] = b(
    () => new io(
      i,
      t
    )
  );
  pe(() => {
    r.setOptions(t);
  }, [r, t]);
  const o = qn(
    De(
      (l) => r.subscribe(ue.batchCalls(l)),
      [r]
    ),
    () => r.getCurrentResult()
  ), s = De(
    (l, a) => {
      r.mutate(l, a).catch(Ee);
    },
    [r]
  );
  if (o.error && Ci(r.options.throwOnError, [o.error]))
    throw o.error;
  return { ...o, mutate: s, mutateAsync: o.mutate };
}
const j = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif", f = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "100%",
    minHeight: "100%",
    fontFamily: j
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(226,232,240,0.8)"
  },
  headerTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#1e293b",
    letterSpacing: "-0.025em",
    fontFamily: j
  },
  closeBtn: {
    width: "2.25rem",
    height: "2.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "0.75rem",
    color: "#94a3b8",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 1.5rem",
    background: "linear-gradient(to bottom right, #f8fafc, rgba(239,246,255,0.5))",
    border: "2px dashed #e2e8f0",
    borderRadius: "1rem"
  },
  emptyStateIcon: {
    width: "4rem",
    height: "4rem",
    margin: "0 auto 1rem",
    borderRadius: "1rem",
    background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  emptyStateText: {
    color: "#475569",
    fontSize: "0.875rem",
    marginBottom: "1.25rem",
    lineHeight: 1.625
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(to right, #3b82f6, #2563eb)",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  secondaryBtn: {
    flex: 1,
    padding: "0.75rem 1.25rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#475569",
    fontFamily: j
  },
  selectorBox: {
    padding: "0.625rem 1rem",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontFamily: "ui-monospace, monospace",
    fontSize: "0.75rem",
    color: "#334155",
    wordBreak: "break-all"
  },
  elementInfo: {
    padding: "1rem",
    background: "rgba(239,246,255,0.9)",
    border: "1px solid #bfdbfe",
    borderRadius: "0.75rem"
  },
  elementInfoTitle: {
    display: "block",
    marginBottom: "0.5rem",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  elementInfoText: {
    fontSize: "0.875rem",
    color: "rgba(29,78,216,0.9)"
  },
  textarea: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    minHeight: "100px",
    lineHeight: 1.625,
    resize: "vertical",
    fontFamily: j
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: j
  },
  placementGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.5rem"
  },
  placementBtn: (t) => ({
    padding: "0.75rem 1rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    ...t ? { background: "#3b82f6", color: "#fff", border: "none" } : { background: "#fff", color: "#475569", border: "1px solid #e2e8f0" }
  }),
  errorBox: {
    padding: "0.75rem 1rem",
    background: "#fef2f2",
    border: "1px solid #fee2e2",
    borderRadius: "0.75rem",
    color: "#b91c1c",
    fontSize: "0.875rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  },
  actionRow: {
    display: "flex",
    gap: "0.75rem",
    paddingTop: "1rem",
    marginTop: "0.5rem",
    borderTop: "1px solid rgba(226,232,240,0.8)"
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100%",
    background: "#fff"
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.5rem",
    borderBottom: "1px solid rgba(226,232,240,0.8)",
    background: "rgba(248,250,252,0.5)"
  },
  panelBody: {
    flex: 1,
    padding: "1.5rem",
    overflowY: "auto"
  },
  iconBtn: {
    width: "2.25rem",
    height: "2.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "0.75rem",
    color: "#94a3b8",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  card: {
    background: "#fff",
    borderRadius: "1rem",
    padding: "1.25rem",
    border: "1px solid rgba(226,232,240,0.8)",
    transition: "all 0.2s"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "0.125rem 0.625rem",
    flexShrink: 0
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "0.75rem"
  },
  tabRow: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid rgba(226,232,240,0.8)",
    padding: "0 1.5rem",
    background: "#fff"
  },
  tab: (t) => ({
    padding: "1rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: t ? 600 : 500,
    color: t ? "#2563eb" : "#64748b",
    cursor: "pointer",
    position: "relative",
    background: "none",
    border: "none",
    fontFamily: j,
    borderBottom: t ? "2px solid #3b82f6" : "2px solid transparent"
  }),
  heatmapRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 0",
    borderTop: "1px solid rgba(226,232,240,0.8)",
    marginTop: "1.5rem"
  },
  toggle: (t) => ({
    position: "relative",
    width: "3rem",
    height: "1.75rem",
    borderRadius: "9999px",
    cursor: "pointer",
    transition: "all 0.2s",
    background: t ? "#10b981" : "#cbd5e1",
    border: "none"
  }),
  toggleThumb: (t) => ({
    position: "absolute",
    top: "0.25rem",
    left: t ? "1.5rem" : "0.25rem",
    width: "1.25rem",
    height: "1.25rem",
    background: "#fff",
    borderRadius: "9999px",
    transition: "all 0.2s"
  }),
  link: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    color: "#2563eb",
    fontSize: "0.875rem",
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
    background: "none",
    border: "none",
    fontFamily: j
  },
  footer: {
    display: "flex",
    gap: "0.75rem",
    padding: "1rem 1.5rem",
    borderTop: "1px solid rgba(226,232,240,0.8)",
    background: "rgba(248,250,252,0.5)",
    marginTop: "auto"
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    cursor: "pointer",
    padding: "0.75rem",
    borderRadius: "0.75rem",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s"
  },
  searchWrap: {
    position: "relative",
    marginBottom: "1rem"
  },
  searchIcon: {
    position: "absolute",
    left: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    fontSize: "1rem"
  },
  searchInput: {
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 2.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: j
  },
  pageItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.25rem",
    background: "#fff",
    borderRadius: "1rem",
    border: "1px solid rgba(226,232,240,0.8)",
    marginBottom: "0.5rem",
    transition: "all 0.2s"
  },
  iconBtnSm: {
    width: "2rem",
    height: "2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "0.5rem",
    color: "#94a3b8",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  comingSoon: {
    padding: "2rem 0",
    textAlign: "center"
  },
  comingSoonIcon: {
    width: "4rem",
    height: "4rem",
    margin: "0 auto 1rem",
    borderRadius: "1rem",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }
}, Oo = `
* { font-family: ${j}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function G({
  variant: t,
  children: e,
  onClick: i,
  type: r = "button",
  title: o,
  active: s = !1,
  style: l,
  class: a,
  disabled: u,
  "aria-label": d
}) {
  const h = t === "primary" ? f.primaryBtn : t === "secondary" ? f.secondaryBtn : t === "icon" ? f.iconBtn : t === "iconSm" ? f.iconBtnSm : t === "placement" ? f.placementBtn(s) : {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.25rem",
    fontFamily: j
  }, c = l ? { ...h, ...l } : h;
  return /* @__PURE__ */ n(
    "button",
    {
      type: r,
      style: c,
      class: a,
      onClick: i,
      title: o,
      disabled: u,
      "aria-label": d,
      children: e
    }
  );
}
const Ao = [
  {
    label: "GENERAL",
    blocks: [
      { type: "text", icon: "mdi:format-text", label: "Text" },
      { type: "button", icon: "mdi:gesture-tap-button", label: "Button" },
      { type: "horizontal-line", icon: "mdi:minus", label: "Horizontal Line" }
    ]
  },
  {
    label: "MEDIA",
    blocks: [
      { type: "image", icon: "mdi:image-outline", label: "Image" },
      { type: "video", icon: "mdi:video-outline", label: "Video" }
    ]
  },
  {
    label: "POLLS",
    blocks: [
      { type: "poll-text", icon: "mdi:comment-text-outline", label: "Open Text" },
      { type: "poll-yes-no", icon: "mdi:check-circle-outline", label: "Yes / No" },
      { type: "poll-scale", icon: "mdi:pound", label: "Number Scale" },
      { type: "poll-nps", icon: "mdi:numeric-10-box-outline", label: "NPS (0–10)" },
      { type: "poll-multiple-choice", icon: "mdi:radiobox-marked", label: "Multiple Choice" },
      { type: "poll-checkboxes", icon: "mdi:checkbox-marked-outline", label: "Checkboxes" },
      { type: "poll-star-rating", icon: "mdi:star-outline", label: "Star Rating" },
      { type: "poll-dropdown", icon: "mdi:chevron-down-box-outline", label: "Dropdown" },
      { type: "poll-slider", icon: "mdi:tune-variant", label: "Slider" },
      { type: "poll-ranking", icon: "mdi:sort-variant", label: "Ranking" },
      { type: "poll-matrix", icon: "mdi:grid", label: "Matrix" }
    ]
  }
];
function Po({ onAddBlock: t, onClose: e }) {
  return /* @__PURE__ */ n("div", { style: {
    width: "210px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #e2e8f0",
    background: "#fff",
    fontFamily: j
  }, children: [
    /* @__PURE__ */ n("div", { style: { padding: "1.25rem 1rem", borderBottom: "1px solid #e2e8f0" }, children: [
      /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }, children: "Building Blocks" }),
      /* @__PURE__ */ n("div", { style: { fontSize: "0.65rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.2rem" }, children: "Click to add component" })
    ] }),
    /* @__PURE__ */ n("div", { style: { flex: 1, overflowY: "auto", padding: "0.75rem" }, children: Ao.map((i) => /* @__PURE__ */ n("div", { style: { marginBottom: "1.25rem" }, children: [
      /* @__PURE__ */ n("div", { style: f.sectionLabel, children: i.label }),
      /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.3rem" }, children: i.blocks.map(({ type: r, icon: o, label: s }) => /* @__PURE__ */ n(
        "button",
        {
          onClick: () => t(r),
          style: {
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.55rem 0.7rem",
            border: "1px solid #e2e8f0",
            borderRadius: "0.625rem",
            background: "#fff",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "#334155",
            fontFamily: j,
            textAlign: "left",
            width: "100%",
            transition: "all 0.15s"
          },
          onMouseEnter: (l) => {
            const a = l.currentTarget;
            a.style.borderColor = "#3b82f6", a.style.background = "rgba(59,130,246,0.04)", a.style.color = "#1d4ed8";
          },
          onMouseLeave: (l) => {
            const a = l.currentTarget;
            a.style.borderColor = "#e2e8f0", a.style.background = "#fff", a.style.color = "#334155";
          },
          children: [
            /* @__PURE__ */ n("iconify-icon", { icon: o, style: { fontSize: "1rem", color: "#64748b", flexShrink: 0 } }),
            s
          ]
        },
        r
      )) })
    ] }, i.label)) }),
    /* @__PURE__ */ n("div", { style: { padding: "0.75rem", borderTop: "1px solid #e2e8f0" }, children: /* @__PURE__ */ n(
      "button",
      {
        onClick: e,
        style: {
          width: "100%",
          padding: "0.6rem",
          border: "1px solid #e2e8f0",
          borderRadius: "0.625rem",
          background: "#f8fafc",
          cursor: "pointer",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#64748b",
          fontFamily: j
        },
        children: "Close Editor"
      }
    ) })
  ] });
}
const pn = [
  { label: "Agree – Disagree", choices: ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"] },
  { label: "Satisfied – Dissatisfied", choices: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"] },
  { label: "Yes – No", choices: ["Yes", "No"] },
  { label: "Likely – Unlikely", choices: ["Very likely", "Likely", "Neutral", "Unlikely", "Very unlikely"] },
  { label: "Always – Never", choices: ["Always", "Often", "Sometimes", "Rarely", "Never"] },
  { label: "Easy – Difficult", choices: ["Very easy", "Easy", "Neutral", "Difficult", "Very difficult"] },
  { label: "Approve – Disapprove", choices: ["Strongly approve", "Approve", "Neutral", "Disapprove", "Strongly disapprove"] },
  { label: "Better – Worse", choices: ["Much better", "Better", "About the same", "Worse", "Much worse"] },
  { label: "High – Low quality", choices: ["Very high quality", "High quality", "Average", "Low quality", "Very low quality"] },
  { label: "True – False", choices: ["True", "False"] },
  { label: "Interested – Not interested", choices: ["Very interested", "Interested", "Neutral", "Not interested", "Not at all interested"] }
];
function kt({
  choices: t,
  onChange: e,
  inputType: i = "radio",
  allowOther: r,
  onAllowOtherChange: o,
  showRandomize: s,
  randomize: l,
  onRandomizeChange: a
}) {
  const [u, d] = b(!1), [h, c] = b(""), p = (v, S) => {
    const T = [...t];
    T[v] = S, e(T);
  }, m = (v) => {
    const S = [...t];
    S.splice(v + 1, 0, `Option ${S.length + 1}`), e(S);
  }, _ = (v) => {
    e(t.filter((S, T) => T !== v));
  }, x = (v, S) => {
    const T = [...t], F = v + S;
    F < 0 || F >= T.length || ([T[v], T[F]] = [T[F], T[v]], e(T));
  }, I = (v) => {
    const S = pn.find((T) => T.label === v);
    S && e([...S.choices]);
  }, k = () => {
    const v = h.split(`
`).map((S) => S.trim()).filter(Boolean);
    v.length && e(v), d(!1), c("");
  }, E = i === "checkbox" ? "□" : "○";
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "6px", fontFamily: j }, children: [
    /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }, children: [
      /* @__PURE__ */ n("span", { style: { fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }, children: "Answer Genius" }),
      /* @__PURE__ */ n(
        "select",
        {
          onChange: (v) => I(v.target.value),
          defaultValue: "",
          style: {
            fontSize: "0.72rem",
            padding: "3px 6px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            background: "#f8fafc",
            color: "#334155",
            fontFamily: j,
            cursor: "pointer"
          },
          children: [
            /* @__PURE__ */ n("option", { value: "", disabled: !0, children: "Select preset…" }),
            pn.map((v) => /* @__PURE__ */ n("option", { value: v.label, children: v.label }, v.label))
          ]
        }
      )
    ] }),
    t.map((v, S) => /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "5px" }, children: [
      /* @__PURE__ */ n("span", { style: { fontSize: "13px", color: "#cbd5e1", width: "14px", flexShrink: 0, userSelect: "none" }, children: E }),
      /* @__PURE__ */ n(
        "input",
        {
          type: "text",
          value: v,
          onInput: (T) => p(S, T.target.value),
          style: {
            flex: 1,
            padding: "5px 8px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "0.8rem",
            fontFamily: j,
            color: "#1e293b",
            background: "#fafafa",
            outline: "none"
          },
          onFocus: (T) => {
            T.target.style.borderColor = "#3b82f6";
          },
          onBlur: (T) => {
            T.target.style.borderColor = "#e2e8f0";
          }
        }
      ),
      /* @__PURE__ */ n("button", { onClick: () => m(S), title: "Add below", style: It, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus", style: { fontSize: "12px" } }) }),
      /* @__PURE__ */ n("button", { onClick: () => x(S, -1), disabled: S === 0, title: "Move up", style: { ...It, opacity: S === 0 ? 0.35 : 1 }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-up", style: { fontSize: "12px" } }) }),
      /* @__PURE__ */ n("button", { onClick: () => x(S, 1), disabled: S === t.length - 1, title: "Move down", style: { ...It, opacity: S === t.length - 1 ? 0.35 : 1 }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-down", style: { fontSize: "12px" } }) }),
      /* @__PURE__ */ n("button", { onClick: () => _(S), title: "Delete", style: { ...It, color: "#ef4444" }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "12px" } }) })
    ] }, S)),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: "12px", marginTop: "2px" }, children: [
      /* @__PURE__ */ n(
        "button",
        {
          onClick: () => e([...t, `Option ${t.length + 1}`]),
          style: { fontSize: "0.72rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: j, fontWeight: 600, padding: 0 },
          children: "⊕ Add choice"
        }
      ),
      /* @__PURE__ */ n(
        "button",
        {
          onClick: () => d(!u),
          style: { fontSize: "0.72rem", color: "#64748b", background: "none", border: "none", cursor: "pointer", fontFamily: j, fontWeight: 500, padding: 0 },
          children: "≡ Bulk add"
        }
      )
    ] }),
    u && /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "6px" }, children: [
      /* @__PURE__ */ n(
        "textarea",
        {
          value: h,
          onInput: (v) => c(v.target.value),
          placeholder: "One choice per line…",
          rows: 4,
          style: {
            width: "100%",
            padding: "6px 8px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "0.8rem",
            fontFamily: j,
            resize: "vertical",
            color: "#1e293b",
            boxSizing: "border-box"
          }
        }
      ),
      /* @__PURE__ */ n("div", { style: { display: "flex", gap: "6px" }, children: [
        /* @__PURE__ */ n("button", { onClick: k, style: { ...fn, background: "#3b82f6", color: "#fff" }, children: "Apply" }),
        /* @__PURE__ */ n("button", { onClick: () => d(!1), style: { ...fn, background: "#f1f5f9", color: "#64748b" }, children: "Cancel" })
      ] })
    ] }),
    (o !== void 0 || a !== void 0) && /* @__PURE__ */ n("div", { style: { borderTop: "1px solid #f1f5f9", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "5px" }, children: [
      o !== void 0 && /* @__PURE__ */ n("label", { style: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#475569", cursor: "pointer" }, children: [
        /* @__PURE__ */ n(
          "input",
          {
            type: "checkbox",
            checked: !!r,
            onChange: (v) => o(v.target.checked)
          }
        ),
        'Add "Other" answer option'
      ] }),
      s && a !== void 0 && /* @__PURE__ */ n("label", { style: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#475569", cursor: "pointer" }, children: [
        /* @__PURE__ */ n(
          "input",
          {
            type: "checkbox",
            checked: !!l,
            onChange: (v) => a(v.target.checked)
          }
        ),
        "Randomize answer order"
      ] })
    ] })
  ] });
}
const It = {
  width: "22px",
  height: "22px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #e2e8f0",
  borderRadius: "4px",
  background: "#fff",
  cursor: "pointer",
  color: "#64748b",
  padding: 0,
  flexShrink: 0
}, fn = {
  padding: "4px 12px",
  border: "none",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: j
}, Fo = {
  text: "Text",
  image: "Image",
  button: "Button",
  "horizontal-line": "Horizontal Line",
  video: "Video",
  "poll-text": "Open Text Poll",
  "poll-yes-no": "Yes/No Poll",
  "poll-scale": "Number Scale Poll",
  "poll-nps": "NPS Score",
  "poll-multiple-choice": "Multiple Choice",
  "poll-checkboxes": "Checkboxes",
  "poll-star-rating": "Star Rating",
  "poll-dropdown": "Dropdown",
  "poll-slider": "Slider",
  "poll-ranking": "Ranking",
  "poll-matrix": "Matrix"
};
function D({ label: t, children: e }) {
  return /* @__PURE__ */ n("div", { style: { marginBottom: "1rem" }, children: [
    /* @__PURE__ */ n("label", { style: {
      display: "block",
      fontSize: "0.7rem",
      fontWeight: 600,
      color: "#64748b",
      marginBottom: "0.35rem",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontFamily: j
    }, children: t }),
    e
  ] });
}
const ae = {
  ...f.input,
  boxSizing: "border-box",
  fontSize: "0.85rem",
  padding: "0.55rem 0.75rem"
}, Le = {
  ...f.textarea,
  boxSizing: "border-box",
  fontSize: "0.85rem",
  padding: "0.55rem 0.75rem",
  minHeight: "unset"
}, Tt = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  border: "1px solid #e2e8f0",
  borderRadius: "0.625rem",
  fontSize: "0.85rem",
  color: "#334155",
  background: "#fff",
  fontFamily: j,
  boxSizing: "border-box"
};
function Lo({ block: t, onUpdate: e, onCancel: i, onDone: r }) {
  const o = t.settings, s = (a, u) => e(t.id, { ...o, [a]: u }), l = () => {
    switch (t.type) {
      case "text":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Theme Style", children: /* @__PURE__ */ n("select", { value: o.themeStyle || "body", onChange: (a) => s("themeStyle", a.target.value), style: Tt, children: [
            /* @__PURE__ */ n("option", { value: "title", children: "Title" }),
            /* @__PURE__ */ n("option", { value: "sub-title", children: "Sub Title" }),
            /* @__PURE__ */ n("option", { value: "body", children: "Body" })
          ] }) }),
          /* @__PURE__ */ n(D, { label: "Content", children: /* @__PURE__ */ n(
            "textarea",
            {
              value: o.content || "",
              onInput: (a) => s("content", a.target.value),
              placeholder: "Enter your text here",
              rows: 4,
              style: Le
            }
          ) })
        ] });
      case "button":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.label || "", onInput: (a) => s("label", a.target.value), placeholder: "Continue", style: ae }) }),
          /* @__PURE__ */ n(D, { label: "Action", children: /* @__PURE__ */ n("select", { value: o.action || "next", onChange: (a) => s("action", a.target.value), style: Tt, children: [
            /* @__PURE__ */ n("option", { value: "next", children: "Next / Finish" }),
            /* @__PURE__ */ n("option", { value: "dismiss", children: "Dismiss" }),
            /* @__PURE__ */ n("option", { value: "url", children: "Open URL" })
          ] }) }),
          o.action === "url" && /* @__PURE__ */ n(D, { label: "URL", children: /* @__PURE__ */ n("input", { type: "text", value: o.url || "", onInput: (a) => s("url", a.target.value), placeholder: "https://...", style: ae }) })
        ] });
      case "image":
        return /* @__PURE__ */ n(D, { label: "Image URL", children: /* @__PURE__ */ n("input", { type: "text", value: o.url || "", onInput: (a) => s("url", a.target.value), placeholder: "https://...", style: ae }) });
      case "video":
        return /* @__PURE__ */ n(D, { label: "Video Embed URL", children: /* @__PURE__ */ n("input", { type: "text", value: o.url || "", onInput: (a) => s("url", a.target.value), placeholder: "https://youtube.com/embed/...", style: ae }) });
      case "poll-text":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "How can we improve?", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Question Style", children: /* @__PURE__ */ n("select", { value: o.themeStyle || "body", onChange: (a) => s("themeStyle", a.target.value), style: Tt, children: [
            /* @__PURE__ */ n("option", { value: "title", children: "Title" }),
            /* @__PURE__ */ n("option", { value: "sub-title", children: "Sub Title" }),
            /* @__PURE__ */ n("option", { value: "body", children: "Body" })
          ] }) }),
          /* @__PURE__ */ n(D, { label: "Answer Placeholder", children: /* @__PURE__ */ n("input", { type: "text", value: o.placeholder || "", onInput: (a) => s("placeholder", a.target.value), placeholder: "Enter text here...", style: ae }) }),
          /* @__PURE__ */ n(D, { label: "Submit Button Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.submitLabel || "", onInput: (a) => s("submitLabel", a.target.value), placeholder: "Submit", style: ae }) })
        ] });
      case "poll-yes-no":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "Was this guide helpful?", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Yes Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.yesLabel || "", onInput: (a) => s("yesLabel", a.target.value), placeholder: "Yes", style: ae }) }),
          /* @__PURE__ */ n(D, { label: "No Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.noLabel || "", onInput: (a) => s("noLabel", a.target.value), placeholder: "No", style: ae }) })
        ] });
      case "poll-scale":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "How would you rate this?", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Min Value", children: /* @__PURE__ */ n("input", { type: "number", value: o.minValue ?? 1, onInput: (a) => s("minValue", Number(a.target.value)), style: ae }) }),
          /* @__PURE__ */ n(D, { label: "Max Value", children: /* @__PURE__ */ n("input", { type: "number", value: o.maxValue ?? 5, onInput: (a) => s("maxValue", Number(a.target.value)), style: ae }) }),
          /* @__PURE__ */ n(D, { label: "Show Min / Max Labels", children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ n(
              "input",
              {
                type: "checkbox",
                checked: o.showLabels ?? !0,
                onChange: (a) => s("showLabels", a.target.checked),
                style: { accentColor: "#1d4ed8", width: "16px", height: "16px", cursor: "pointer" }
              }
            ),
            /* @__PURE__ */ n("span", { style: { fontSize: "0.8rem", color: "#475569", fontFamily: j }, children: "Show labels below scale" })
          ] }) }),
          o.showLabels && /* @__PURE__ */ n(ee, { children: [
            /* @__PURE__ */ n(D, { label: `Min Label (at ${o.minValue ?? 1})`, children: /* @__PURE__ */ n(
              "input",
              {
                type: "text",
                value: o.labels?.[o.minValue ?? 1] || "",
                onInput: (a) => s("labels", { ...o.labels, [o.minValue ?? 1]: a.target.value }),
                placeholder: "e.g. Not likely",
                style: ae
              }
            ) }),
            /* @__PURE__ */ n(D, { label: `Max Label (at ${o.maxValue ?? 5})`, children: /* @__PURE__ */ n(
              "input",
              {
                type: "text",
                value: o.labels?.[o.maxValue ?? 5] || "",
                onInput: (a) => s("labels", { ...o.labels, [o.maxValue ?? 5]: a.target.value }),
                placeholder: "e.g. Very likely",
                style: ae
              }
            ) })
          ] }),
          /* @__PURE__ */ n(D, { label: "Submit Button Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.submitLabel || "", onInput: (a) => s("submitLabel", a.target.value), placeholder: "Submit", style: ae }) })
        ] });
      case "poll-nps":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "How likely are you to recommend us?", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Low End Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.lowLabel || "", onInput: (a) => s("lowLabel", a.target.value), placeholder: "Not at all likely", style: ae }) }),
          /* @__PURE__ */ n(D, { label: "High End Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.highLabel || "", onInput: (a) => s("highLabel", a.target.value), placeholder: "Extremely likely", style: ae }) })
        ] });
      case "poll-multiple-choice":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "Select an option", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Choices", children: /* @__PURE__ */ n(
            kt,
            {
              choices: o.choices || ["Option 1", "Option 2", "Option 3"],
              onChange: (a) => s("choices", a),
              inputType: "radio",
              allowOther: !!o.allowOther,
              onAllowOtherChange: (a) => s("allowOther", a),
              showRandomize: !0,
              randomize: !!o.randomize,
              onRandomizeChange: (a) => s("randomize", a)
            }
          ) })
        ] });
      case "poll-checkboxes":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "Select all that apply", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Choices", children: /* @__PURE__ */ n(
            kt,
            {
              choices: o.choices || ["Option 1", "Option 2", "Option 3"],
              onChange: (a) => s("choices", a),
              inputType: "checkbox",
              allowOther: !!o.allowOther,
              onAllowOtherChange: (a) => s("allowOther", a),
              showRandomize: !0,
              randomize: !!o.randomize,
              onRandomizeChange: (a) => s("randomize", a)
            }
          ) })
        ] });
      case "poll-star-rating":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "How would you rate your experience?", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Number of Stars", children: /* @__PURE__ */ n("select", { value: o.maxStars ?? 5, onChange: (a) => s("maxStars", Number(a.target.value)), style: Tt, children: [3, 4, 5, 6, 7, 8, 9, 10].map((a) => /* @__PURE__ */ n("option", { value: a, children: [
            a,
            " stars"
          ] }, a)) }) })
        ] });
      case "poll-dropdown":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "Select an option", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Options", children: /* @__PURE__ */ n(
            kt,
            {
              choices: o.choices || ["Option 1", "Option 2", "Option 3"],
              onChange: (a) => s("choices", a)
            }
          ) })
        ] });
      case "poll-slider":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "How satisfied are you?", rows: 3, style: Le }) }),
          /* @__PURE__ */ n("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }, children: [
            /* @__PURE__ */ n(D, { label: "Min", children: /* @__PURE__ */ n("input", { type: "number", value: o.min ?? 0, onInput: (a) => s("min", Number(a.target.value)), style: ae }) }),
            /* @__PURE__ */ n(D, { label: "Max", children: /* @__PURE__ */ n("input", { type: "number", value: o.max ?? 10, onInput: (a) => s("max", Number(a.target.value)), style: ae }) }),
            /* @__PURE__ */ n(D, { label: "Step", children: /* @__PURE__ */ n("input", { type: "number", value: o.step ?? 1, onInput: (a) => s("step", Number(a.target.value)), style: ae }) })
          ] }),
          /* @__PURE__ */ n(D, { label: "Min Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.minLabel || "", onInput: (a) => s("minLabel", a.target.value), placeholder: "Not satisfied", style: ae }) }),
          /* @__PURE__ */ n(D, { label: "Max Label", children: /* @__PURE__ */ n("input", { type: "text", value: o.maxLabel || "", onInput: (a) => s("maxLabel", a.target.value), placeholder: "Very satisfied", style: ae }) })
        ] });
      case "poll-ranking":
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (a) => s("question", a.target.value), placeholder: "Rank in order of importance", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Items to Rank", children: /* @__PURE__ */ n(
            kt,
            {
              choices: o.choices || ["Item 1", "Item 2", "Item 3"],
              onChange: (a) => s("choices", a)
            }
          ) })
        ] });
      case "poll-matrix": {
        const a = o.rows || ["Item 1", "Item 2", "Item 3"], u = o.columns || ["Poor", "Fair", "Good", "Excellent"];
        return /* @__PURE__ */ n(ee, { children: [
          /* @__PURE__ */ n(D, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: o.question || "", onInput: (d) => s("question", d.target.value), placeholder: "Please rate the following", rows: 3, style: Le }) }),
          /* @__PURE__ */ n(D, { label: "Rows", children: [
            a.map((d, h) => /* @__PURE__ */ n("div", { style: { display: "flex", gap: "4px", marginBottom: "4px" }, children: [
              /* @__PURE__ */ n(
                "input",
                {
                  type: "text",
                  value: d,
                  onInput: (c) => {
                    const p = [...a];
                    p[h] = c.target.value, s("rows", p);
                  },
                  style: { ...ae, flex: 1 },
                  placeholder: `Row ${h + 1}`
                }
              ),
              /* @__PURE__ */ n("button", { onClick: () => s("rows", a.filter((c, p) => p !== h)), style: { padding: "0 8px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fff1f2", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem" }, children: "✕" })
            ] }, h)),
            /* @__PURE__ */ n("button", { onClick: () => s("rows", [...a, ""]), style: { fontSize: "0.72rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: j, fontWeight: 600, padding: 0 }, children: "⊕ Add row" })
          ] }),
          /* @__PURE__ */ n(D, { label: "Columns", children: [
            u.map((d, h) => /* @__PURE__ */ n("div", { style: { display: "flex", gap: "4px", marginBottom: "4px" }, children: [
              /* @__PURE__ */ n(
                "input",
                {
                  type: "text",
                  value: d,
                  onInput: (c) => {
                    const p = [...u];
                    p[h] = c.target.value, s("columns", p);
                  },
                  style: { ...ae, flex: 1 },
                  placeholder: `Column ${h + 1}`
                }
              ),
              /* @__PURE__ */ n("button", { onClick: () => s("columns", u.filter((c, p) => p !== h)), style: { padding: "0 8px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fff1f2", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem" }, children: "✕" })
            ] }, h)),
            /* @__PURE__ */ n("button", { onClick: () => s("columns", [...u, ""]), style: { fontSize: "0.72rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: j, fontWeight: 600, padding: 0 }, children: "⊕ Add column" })
          ] })
        ] });
      }
      case "horizontal-line":
        return /* @__PURE__ */ n("p", { style: { fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic", margin: 0 }, children: "No settings for this block." });
      default:
        return null;
    }
  };
  return /* @__PURE__ */ n("div", { style: {
    width: "260px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderLeft: "1px solid #e2e8f0",
    background: "#fff",
    fontFamily: j
  }, children: [
    /* @__PURE__ */ n("div", { style: { padding: "1.25rem 1rem", borderBottom: "1px solid #e2e8f0" }, children: [
      /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }, children: [
        "Edit ",
        Fo[t.type] || t.type
      ] }),
      /* @__PURE__ */ n("div", { style: { fontSize: "0.65rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.2rem" }, children: "Configure Component" })
    ] }),
    /* @__PURE__ */ n("div", { style: { flex: 1, overflowY: "auto", padding: "1rem" }, children: l() }),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem", padding: "0.75rem 1rem", borderTop: "1px solid #e2e8f0" }, children: [
      /* @__PURE__ */ n(
        "button",
        {
          onClick: i,
          style: {
            flex: 1,
            padding: "0.6rem",
            border: "1px solid #e2e8f0",
            borderRadius: "0.625rem",
            background: "#f8fafc",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#64748b",
            fontFamily: j
          },
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ n(
        "button",
        {
          onClick: r,
          style: {
            flex: 1,
            padding: "0.6rem",
            border: "none",
            borderRadius: "0.625rem",
            background: "#1d4ed8",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#fff",
            fontFamily: j
          },
          children: "Done"
        }
      )
    ] })
  ] });
}
const zo = {
  text: { content: "Enter your text here", themeStyle: "body" },
  image: { url: "" },
  button: { label: "Next", action: "next" },
  "horizontal-line": {},
  video: { url: "" },
  "poll-text": { question: "How can we improve?", placeholder: "Enter text here...", submitLabel: "Submit", themeStyle: "body" },
  "poll-yes-no": { question: "Was this helpful?", yesLabel: "Yes", noLabel: "No" },
  "poll-scale": { question: "How would you rate this?", minValue: 1, maxValue: 5, showLabels: !0, labels: { 1: "Low", 5: "High" }, submitLabel: "Submit" },
  "poll-nps": { question: "How likely are you to recommend us to a friend or colleague?", lowLabel: "Not at all likely", highLabel: "Extremely likely" },
  "poll-multiple-choice": { question: "Select an option", choices: ["Option 1", "Option 2", "Option 3"], allowOther: !1, randomize: !1 },
  "poll-checkboxes": { question: "Select all that apply", choices: ["Option 1", "Option 2", "Option 3"], allowOther: !1, randomize: !1 },
  "poll-star-rating": { question: "How would you rate your experience?", maxStars: 5 },
  "poll-dropdown": { question: "Select an option", choices: ["Option 1", "Option 2", "Option 3"] },
  "poll-slider": { question: "How satisfied are you?", min: 0, max: 10, step: 1, minLabel: "Not satisfied", maxLabel: "Very satisfied" },
  "poll-ranking": { question: "Rank the following in order of importance", choices: ["Item 1", "Item 2", "Item 3"] },
  "poll-matrix": { question: "Please rate the following", rows: ["Item 1", "Item 2", "Item 3"], columns: ["Poor", "Fair", "Good", "Excellent"] }
};
function Kt(t, e = !1) {
  return {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${e ? "#fca5a5" : "#e2e8f0"}`,
    borderRadius: "4px",
    background: e ? "#fff1f2" : "#fff",
    cursor: t ? "not-allowed" : "pointer",
    opacity: t ? 0.35 : 1,
    color: e ? "#dc2626" : "#475569",
    padding: 0,
    fontFamily: j
  };
}
const Rt = () => {
};
function Do(t) {
  if (t.blocks && t.blocks.length > 0) return t.blocks;
  const e = [], i = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return t.title && e.push({ id: i(), type: "text", settings: { content: t.title, themeStyle: "title" } }), t.description && e.push({ id: i(), type: "text", settings: { content: t.description, themeStyle: "body" } }), t.body && e.push({ id: i(), type: "text", settings: { content: t.body, themeStyle: "body" } }), t.buttonContent && e.push({ id: i(), type: "button", settings: { label: t.buttonContent, action: "next" } }), e;
}
function No({ initialContent: t, onSave: e, onClose: i, onPreview: r, stepLabel: o, surveyMode: s }) {
  const l = (() => {
    try {
      return JSON.parse(t || "{}");
    } catch {
      return {};
    }
  })(), [a, u] = b(Do(l)), [d, h] = b(null), c = a.find((v) => v.id === d) ?? null, p = (v) => {
    const S = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: v,
      settings: { ...zo[v] }
    };
    u((T) => [...T, S]), h(S.id);
  }, m = (v, S) => {
    u((T) => T.map((F) => F.id === v ? { ...F, settings: S } : F));
  }, _ = (v) => {
    u((S) => S.filter((T) => T.id !== v)), d === v && h(null);
  }, x = (v, S) => {
    const T = v + S;
    u((F) => {
      if (T < 0 || T >= F.length) return F;
      const P = [...F];
      return [P[v], P[T]] = [P[T], P[v]], P;
    });
  }, I = () => {
    const v = { blocks: a };
    return l.layout && (v.layout = l.layout), JSON.stringify(v);
  }, k = () => {
    e(I());
  }, E = () => {
    r && r(I(), s ? "survey" : void 0);
  };
  return /* @__PURE__ */ n("div", { style: {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    display: "flex",
    background: "#F8FAFC",
    fontFamily: j
  }, children: [
    /* @__PURE__ */ n(Po, { onAddBlock: p, onClose: i }),
    /* @__PURE__ */ n("div", { style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      overflowY: "auto",
      position: "relative"
    }, children: [
      /* @__PURE__ */ n("div", { style: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.04,
        backgroundImage: "radial-gradient(#1855BC 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      } }),
      /* @__PURE__ */ n("div", { style: { position: "absolute", top: "1.75rem", left: "2rem", zIndex: 10 }, children: [
        /* @__PURE__ */ n("h1", { style: { fontSize: "1.4rem", fontWeight: 700, color: "#222", margin: 0, letterSpacing: "-0.03em" }, children: o ? `Editing: ${o}` : "Design your guide step" }),
        /* @__PURE__ */ n("p", { style: { fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem", fontWeight: 500 }, children: "Drag and drop building blocks to craft your experience" })
      ] }),
      /* @__PURE__ */ n("div", { style: {
        position: "relative",
        width: "100%",
        maxWidth: "440px",
        background: "#fff",
        borderRadius: "1rem",
        boxShadow: "0 32px 64px -12px rgba(0,0,0,0.14)",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        zIndex: 10,
        marginTop: "3.5rem"
      }, children: [
        /* @__PURE__ */ n("div", { style: {
          position: "absolute",
          top: "12px",
          right: "12px",
          color: "#cbd5e1",
          cursor: "not-allowed",
          zIndex: 20
        }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "16px" } }) }),
        /* @__PURE__ */ n("div", { style: { padding: "1.5rem", display: "flex", flexDirection: "column", gap: 0 }, children: a.length === 0 ? /* @__PURE__ */ n("div", { style: {
          padding: "3rem 1rem",
          border: "2px dashed #e2e8f0",
          borderRadius: "0.75rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          color: "#94a3b8"
        }, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus-circle-outline", style: { fontSize: "2rem" } }),
          /* @__PURE__ */ n("span", { style: { fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }, children: "Click a block type on the left to start" })
        ] }) : a.map((v, S) => {
          const T = d === v.id;
          return /* @__PURE__ */ n(
            "div",
            {
              onClick: () => h(v.id),
              style: {
                position: "relative",
                borderRadius: "0.5rem",
                border: T ? "2px solid #3b82f6" : "2px solid transparent",
                background: T ? "rgba(59,130,246,0.03)" : "transparent",
                cursor: "pointer",
                transition: "border-color 0.15s",
                padding: "4px",
                marginBottom: "4px"
              },
              children: [
                T && /* @__PURE__ */ n("div", { style: {
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  display: "flex",
                  gap: "4px",
                  zIndex: 10
                }, children: [
                  /* @__PURE__ */ n("button", { onClick: (F) => {
                    F.stopPropagation(), x(S, -1);
                  }, style: Kt(S === 0), title: "Move up", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-up", style: { fontSize: "14px" } }) }),
                  /* @__PURE__ */ n("button", { onClick: (F) => {
                    F.stopPropagation(), x(S, 1);
                  }, style: Kt(S === a.length - 1), title: "Move down", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-down", style: { fontSize: "14px" } }) }),
                  /* @__PURE__ */ n("button", { onClick: (F) => {
                    F.stopPropagation(), _(v.id);
                  }, style: Kt(!1, !0), title: "Delete", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:trash-can-outline", style: { fontSize: "14px" } }) })
                ] }),
                /* @__PURE__ */ n("div", { style: { pointerEvents: "none" }, children: /* @__PURE__ */ n(
                  $t,
                  {
                    block: v,
                    onNext: Rt,
                    onBack: Rt,
                    onDismiss: Rt,
                    onAction: Rt,
                    isFirstStep: !0,
                    isLastStep: !0,
                    surveyMode: s
                  }
                ) })
              ]
            },
            v.id
          );
        }) })
      ] }),
      /* @__PURE__ */ n("div", { style: { marginTop: "2rem", display: "flex", gap: "0.75rem", zIndex: 10, position: "relative" }, children: [
        r && /* @__PURE__ */ n(
          "button",
          {
            onClick: E,
            style: {
              padding: "0.75rem 2rem",
              background: "#fff",
              color: "#1855BC",
              border: "2px solid #1855BC",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              fontFamily: j,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            },
            children: [
              /* @__PURE__ */ n("iconify-icon", { icon: "mdi:eye-outline", style: { fontSize: "16px" } }),
              "Preview on Page"
            ]
          }
        ),
        /* @__PURE__ */ n(
          "button",
          {
            onClick: k,
            style: {
              padding: "0.75rem 3rem",
              background: "#1855BC",
              color: "#fff",
              border: "none",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              fontFamily: j,
              boxShadow: "0 10px 20px rgba(24,85,188,0.2)"
            },
            children: "Save Template"
          }
        )
      ] })
    ] }),
    c && /* @__PURE__ */ n(
      Lo,
      {
        block: c,
        onUpdate: m,
        onCancel: () => h(null),
        onDone: () => h(null)
      }
    )
  ] });
}
const mn = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" }
];
function Mo({
  onBack: t,
  guideName: e,
  initialIgnoreThrottling: i = !1,
  initialRepeatOnDismiss: r = !1,
  initialRepeatInterval: o = 1,
  initialRepeatUnit: s = "day",
  initialExpirationType: l = "never",
  initialExpirationValue: a = 2,
  initialRepeatDays: u = null,
  onSave: d
}) {
  const [h, c] = b(i), [p, m] = b(r), [_, x] = b(o), [I, k] = b(s), [E, v] = b(l), [S, T] = b(a), F = Lt(u), [P, U] = b(F.length > 0), [q, Z] = b(F), [N, Q] = b(!1), [X, _e] = b(!1), se = () => {
    if (!p) return "This guide appears on every page load. Dismissals are not tracked.";
    const W = _ === 1 ? `This guide will reappear at most once per ${I}` : `This guide will reappear at most once every ${_} ${I}s`, he = P && q.length > 0 ? `, on ${q.map((re) => mn.find((ve) => ve.key === re)?.label ?? re).join(", ")}` : "";
    return E === "dismissals" ? `${W}${he}, up to ${S} dismissal${S !== 1 ? "s" : ""} total.` : `${W}${he}, with no end date.`;
  }, Ae = async () => {
    if (d) {
      Q(!0);
      try {
        await d({
          ignore_throttling: h,
          repeat_on_dismiss: p,
          repeat_interval: p ? _ : null,
          repeat_unit: p ? I : null,
          expiration_type: p ? E : null,
          expiration_value: p && E === "dismissals" ? S : null,
          repeat_days: P && q.length > 0 ? q : null
        }), _e(!0), setTimeout(() => _e(!1), 2e3);
      } finally {
        Q(!1);
      }
    }
  }, ke = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.625rem",
    fontSize: "0.875rem",
    color: "#1e293b",
    background: "#fff",
    fontFamily: j,
    cursor: "pointer"
  }, be = {
    width: "5rem",
    padding: "0.5rem 0.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.625rem",
    fontSize: "0.875rem",
    color: "#1e293b",
    background: "#fff",
    fontFamily: j,
    textAlign: "center"
  }, ce = {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    cursor: "pointer"
  }, me = {
    marginTop: "0.15rem",
    accentColor: "#3b82f6",
    width: "1rem",
    height: "1rem",
    flexShrink: 0
  };
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
    /* @__PURE__ */ n(
      G,
      {
        variant: "secondary",
        style: { alignSelf: "flex-start" },
        onClick: t,
        children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left", style: { marginRight: "0.4rem" } }),
          "Back to Steps"
        ]
      }
    ),
    e && /* @__PURE__ */ n("span", { style: { fontSize: "0.75rem", color: "#94a3b8" }, children: [
      'for "',
      e,
      '"'
    ] }),
    /* @__PURE__ */ n("label", { style: ce, children: [
      /* @__PURE__ */ n(
        "input",
        {
          type: "checkbox",
          checked: h,
          onChange: () => c((W) => !W),
          style: me
        }
      ),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ n("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }, children: "Override account display limit" }),
        /* @__PURE__ */ n("div", { style: { fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }, children: "Show this guide even if the account-wide daily limit has been reached" })
      ] })
    ] }),
    /* @__PURE__ */ n("div", { style: { borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }, children: /* @__PURE__ */ n("div", { style: f.sectionLabel, children: "Dismissal & Repeat Behavior" }) }),
    /* @__PURE__ */ n("label", { style: ce, children: [
      /* @__PURE__ */ n(
        "input",
        {
          type: "checkbox",
          checked: p,
          onChange: () => m((W) => !W),
          style: me
        }
      ),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Apply a cooldown after dismissal" }),
        /* @__PURE__ */ n("div", { style: { fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }, children: "Without a cooldown, the guide appears on every page load even if dismissed" })
      ] })
    ] }),
    p && /* @__PURE__ */ n("div", { style: {
      display: "flex",
      flexDirection: "column",
      gap: "0.875rem",
      padding: "1rem",
      border: "1px solid #e2e8f0",
      borderRadius: "0.75rem",
      background: "#f8fafc"
    }, children: [
      /* @__PURE__ */ n("div", { style: f.section, children: [
        /* @__PURE__ */ n("label", { style: f.label, children: "Show again every" }),
        /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ n(
            "input",
            {
              type: "number",
              min: 1,
              value: _,
              onChange: (W) => {
                const he = parseInt(W.target.value) || 1;
                x(Math.max(1, he));
              },
              style: be
            }
          ),
          /* @__PURE__ */ n(
            "select",
            {
              value: I,
              onChange: (W) => k(W.target.value),
              style: { ...ke, width: "auto", flex: 1 },
              children: [
                /* @__PURE__ */ n("option", { value: "hour", children: "Hour(s)" }),
                /* @__PURE__ */ n("option", { value: "day", children: "Day(s)" }),
                /* @__PURE__ */ n("option", { value: "week", children: "Week(s)" }),
                /* @__PURE__ */ n("option", { value: "month", children: "Month(s)" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ n("div", { style: f.section, children: [
        /* @__PURE__ */ n("label", { style: f.label, children: "Stop showing after" }),
        /* @__PURE__ */ n(
          "select",
          {
            value: E,
            onChange: (W) => v(W.target.value),
            style: ke,
            children: [
              /* @__PURE__ */ n("option", { value: "never", children: "Never stop showing" }),
              /* @__PURE__ */ n("option", { value: "dismissals", children: "A set number of dismissals" })
            ]
          }
        )
      ] }),
      E === "dismissals" && /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
        /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", color: "#475569", fontWeight: 500 }, children: "After" }),
        /* @__PURE__ */ n(
          "input",
          {
            type: "number",
            min: 1,
            value: S,
            onChange: (W) => {
              const he = parseInt(W.target.value) || 1;
              T(Math.max(1, he));
            },
            style: be
          }
        ),
        /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", color: "#475569", fontWeight: 500 }, children: "Dismissal(s)" })
      ] })
    ] }),
    /* @__PURE__ */ n("div", { style: { borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }, children: /* @__PURE__ */ n("div", { style: f.sectionLabel, children: "Schedule by day (optional)" }) }),
    /* @__PURE__ */ n("label", { style: ce, children: [
      /* @__PURE__ */ n(
        "input",
        {
          type: "checkbox",
          checked: P,
          onChange: () => U((W) => !W),
          style: me
        }
      ),
      /* @__PURE__ */ n("div", { children: [
        /* @__PURE__ */ n("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }, children: "Show on specific days of the week" }),
        /* @__PURE__ */ n("div", { style: { fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }, children: "Restrict this guide to selected days only" })
      ] })
    ] }),
    P && /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.375rem", flexWrap: "wrap" }, children: mn.map(({ key: W, label: he }) => {
      const re = q.includes(W);
      return /* @__PURE__ */ n(
        "button",
        {
          onClick: () => Z(
            (ve) => re ? ve.filter((de) => de !== W) : [...ve, W]
          ),
          style: {
            padding: "0.35rem 0.65rem",
            borderRadius: "9999px",
            border: re ? "2px solid #3b82f6" : "1px solid #e2e8f0",
            background: re ? "rgba(59,130,246,0.1)" : "#fff",
            color: re ? "#1d4ed8" : "#64748b",
            fontSize: "0.78rem",
            fontWeight: re ? 700 : 500,
            cursor: "pointer",
            fontFamily: j,
            transition: "all 0.12s"
          },
          children: he
        },
        W
      );
    }) }),
    /* @__PURE__ */ n("div", { style: {
      padding: "0.75rem 1rem",
      background: "rgba(59,130,246,0.05)",
      border: "1px solid #bfdbfe",
      borderRadius: "0.75rem",
      fontSize: "0.8rem",
      color: "#1d4ed8",
      lineHeight: 1.6
    }, children: [
      /* @__PURE__ */ n("iconify-icon", { icon: "mdi:information-outline", style: { marginRight: "0.4rem", verticalAlign: "middle" } }),
      se()
    ] }),
    /* @__PURE__ */ n("div", { style: { ...f.actionRow, marginTop: "0.5rem" }, children: [
      d && /* @__PURE__ */ n(
        G,
        {
          variant: "primary",
          style: { flex: 1 },
          onClick: Ae,
          disabled: N || X,
          children: N ? "Saving…" : X ? "✓ Saved" : "Save"
        }
      ),
      /* @__PURE__ */ n(G, { variant: "secondary", style: { flex: 1 }, onClick: t, children: "Close" })
    ] })
  ] });
}
const Yt = "https://devgw.revgain.ai/rg-pex";
function Xn() {
  if (typeof window > "u")
    return { baseUrl: Yt, accessToken: "", iud: "", rcid: "", schema: "", role: "" };
  try {
    const t = localStorage.getItem("customerDetails") ? JSON.parse(localStorage.getItem("customerDetails")) : null, e = localStorage.getItem("RGAuth") ? JSON.parse(localStorage.getItem("RGAuth")) : null, i = localStorage.getItem("selectedViewUser") ? JSON.parse(localStorage.getItem("selectedViewUser")) : null, r = t?.BASE_API_URL_MAIN ? `${t.BASE_API_URL_MAIN}/rg-pex` : Yt, o = localStorage.getItem("access_token") || "", s = i?.id || e?.email || "", l = t?.RG_CUSTOMER_ID || "", a = t?.CUSTOMER_SCHEMA || "", u = i?.role || i?.manager_role, d = sessionStorage.getItem("RGSelectedRole");
    let h;
    u ? h = [u] : d ? h = [d] : h = e?.realm_access?.roles || [];
    const c = h.map((p) => p.replace(/\s+/g, "_")).join(",");
    return { baseUrl: r, accessToken: o, iud: s, rcid: l, schema: a, role: c };
  } catch {
    return { baseUrl: Yt, accessToken: "", iud: "", rcid: "", schema: "", role: "" };
  }
}
function Ot(t) {
  const { accessToken: e, iud: i, rcid: r, schema: o, role: s } = Xn();
  return {
    "Content-Type": "application/json",
    ...e && { Authorization: `Bearer ${e}` },
    ...s && { role: s },
    ...i && { iud: i },
    ...r && { rcid: r },
    ...o && { schema: o },
    ...t
  };
}
const Uo = "designerIud", Oe = {
  get baseUrl() {
    return Xn().baseUrl;
  },
  async get(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(i, {
      ...e,
      headers: { ...Ot(), ...e?.headers }
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async post(t, e, i) {
    const r = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, o = await fetch(r, {
      method: "POST",
      ...i,
      headers: { ...Ot(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!o.ok) throw new Error(`API error: ${o.status} ${o.statusText}`);
    return o.json();
  },
  async put(t, e, i) {
    const r = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, o = await fetch(r, {
      method: "PUT",
      ...i,
      headers: { ...Ot(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!o.ok) throw new Error(`API error: ${o.status} ${o.statusText}`);
    return o.json();
  },
  async delete(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(i, {
      method: "DELETE",
      ...e,
      headers: { ...Ot(), ...e?.headers }
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  }
}, Jn = (t) => ["guides", "byId", t];
async function Bo(t) {
  const e = new URLSearchParams({ guide_id: t });
  return Oe.get(`/guides?${e.toString()}`);
}
function Wo(t) {
  return Ht({
    queryKey: Jn(t),
    queryFn: () => Bo(t),
    enabled: !!t,
    retry: 0
  });
}
const Go = ["guides", "update"];
async function $o({
  guideId: t,
  payload: e
}) {
  return Oe.put(`/guides/${t}`, e);
}
function Ho() {
  const t = xt();
  return ot({
    mutationKey: Go,
    mutationFn: $o,
    onSuccess: (e, i) => {
      t.invalidateQueries({ queryKey: Jn(i.guideId) });
    }
  });
}
const qo = [
  "top-left",
  "top",
  "top-right",
  null,
  "center",
  null,
  "bottom-left",
  "bottom",
  "bottom-right"
], Vo = {
  "top-left": "↖",
  top: "↑",
  "top-right": "↗",
  center: "●",
  "bottom-left": "↙",
  bottom: "↓",
  "bottom-right": "↘"
}, gn = {
  "top-left": "Top Left",
  top: "Top",
  "top-right": "Top Right",
  center: "Center",
  "bottom-left": "Bottom Left",
  bottom: "Bottom",
  "bottom-right": "Bottom Right"
}, jo = [
  { value: "draft", label: "Draft", bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1", icon: "mdi:pencil-outline" },
  { value: "active", label: "Active", bg: "#dcfce7", color: "#16a34a", border: "#86efac", icon: "mdi:check-circle-outline" },
  { value: "inactive", label: "Inactive", bg: "#fef9c3", color: "#ca8a04", border: "#fde047", icon: "mdi:pause-circle-outline" },
  { value: "archived", label: "Archived", bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", icon: "mdi:archive-outline" }
];
function Qo({
  onMessage: t,
  elementSelected: e,
  guideId: i = null,
  templateId: r = null
}) {
  const [o, s] = b(""), [l, a] = b(void 0), [u, d] = b(null), [h, c] = b(""), [p, m] = b(null), [_, x] = b(!1), [I, k] = b(!1), [E, v] = b("on_click"), [S, T] = b(null), [F, P] = b(!1), [U, q] = b(!1), [Z, N] = b("anchored"), [Q, X] = b("modal"), [_e, se] = b("center"), [Ae, ke] = b("top"), [be, ce] = b(null), [me, W] = b(!1), [he, re] = b(!1), [ve, de] = b(!1), [$e, Ie] = b(!1), [Ye, Se] = b("draft"), ge = vr(null), { data: xe, isLoading: M } = Wo(i), g = xe?.data, te = Me(() => g ? g.templates && g.templates.length > 0 ? g.templates : g.steps || [] : [], [g]), oe = Ho(), Pe = Me(
    () => [...te].sort((w, O) => w.step_order - O.step_order),
    [te]
  ), V = Me(() => p ? te.find((w) => w.map_id === p) : null, [p, te]), He = Me(
    () => Pe.findIndex((w) => w.map_id === p),
    [Pe, p]
  ), C = (w) => {
    try {
      const O = JSON.parse(Re(w) || "{}");
      return O.title || O.blocks?.[0]?.settings?.content?.slice(0, 24) || w.template?.title || "";
    } catch {
      return w.template?.title || "";
    }
  };
  pe(() => {
    if (te.length === 0) return;
    if (r) {
      const O = te.find((K) => K.template_id === r);
      O && m(O.map_id);
      return;
    }
    if (ge.current) {
      const O = te.find((K) => K.template_id === ge.current);
      if (ge.current = null, O) {
        m(O.map_id);
        return;
      }
    }
    const w = te.some((O) => O.map_id === p);
    (!p || !w) && m(te[0].map_id);
  }, [te, r]), pe(() => {
    if (g) {
      const w = !!g.target_segment && g.target_segment !== "None";
      v(g.is_auto || !w ? "automatic" : "on_click");
      const O = g.status;
      (O === "draft" || O === "active" || O === "inactive" || O === "archived") && Se(O);
    }
  }, [g]), pe(() => {
    if (ce(null), V) {
      q(V.auto_click_target ?? !1), N(V.x_path ? "anchored" : "floating");
      try {
        const w = JSON.parse(Re(V) || "{}"), O = w.layout?.renderAs, K = w.layout?.position;
        O === "banner" ? (X("banner"), ke(K === "bottom" ? "bottom" : "top")) : (X("modal"), se(K ?? "center"));
      } catch {
        X("modal"), se("center");
      }
    } else
      q(!1), se("center"), N("floating");
  }, [V, i]), pe(() => {
    t({ type: "EDITOR_READY" });
  }, []), pe(() => {
    e ? _ ? T({
      selector: e.selector,
      xpath: e.xpath,
      elementInfo: e.elementInfo
    }) : (s(e.selector), a(e.xpath), d(e.elementInfo), c("")) : _ && T(null);
  }, [e, _]);
  const ie = () => {
    P(!1), s(""), a(void 0), d(null), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, we = () => {
    P(!1), s(""), a(void 0), d(null), N("floating"), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, qe = () => {
    P(!1), s(""), a(void 0), d(null), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, $ = (w, O) => {
    try {
      const K = JSON.parse(w || "{}");
      return O && (K.layout || (K.layout = {}), Q === "banner" ? (K.layout.renderAs = "banner", K.layout.position = Ae) : (K.layout.renderAs = "modal", K.layout.position = _e)), JSON.stringify(K);
    } catch {
      return O ? JSON.stringify({ layout: Q === "banner" ? { renderAs: "banner", position: Ae } : { renderAs: "modal", position: _e } }) : w;
    }
  }, L = async () => {
    if (!g || !i) return;
    const w = je();
    l ?? (o && (o.startsWith("/") || o.startsWith("//")));
    const O = te.slice().sort((Y, H) => Y.step_order - H.step_order).map((Y) => {
      const H = Y.map_id === p;
      let ye = Y.x_path;
      H && (ye = Z === "floating" ? null : l || o || Y.x_path);
      const Xe = !ye, St = H ? be ?? Re(Y) : Re(Y);
      return {
        template_id: Y.template_id,
        step_order: Y.step_order,
        url: H ? w : Y.url ?? w,
        x_path: ye,
        auto_click_target: H ? U : Y.auto_click_target ?? !1,
        content: H ? $(St, Xe) : St
      };
    }), K = {
      guide_name: g.guide_name ?? "",
      description: g.description ?? "",
      target_segment: g.target_segment ?? null,
      guide_category: g.guide_category ?? null,
      target_page: g.target_page ?? w,
      type: g.type ?? "modal",
      trigger_type: E === "automatic" ? "page_load" : "click",
      is_auto: E === "automatic",
      ignore_throttling: g.ignore_throttling ?? !1,
      repeat_on_dismiss: g.repeat_on_dismiss ?? !1,
      repeat_interval: g.repeat_interval ?? null,
      repeat_unit: g.repeat_unit ?? null,
      expiration_type: g.expiration_type ?? null,
      expiration_value: g.expiration_value ?? null,
      repeat_days: Lt(g.repeat_days),
      status: g.status ?? "draft",
      priority: g.priority ?? 0,
      templates: O
    };
    c(""), ge.current = V?.template_id ?? null;
    try {
      await oe.mutateAsync({ guideId: i, payload: K }), qe(), re(!0), setTimeout(() => re(!1), 2e3);
    } catch (Y) {
      ge.current = null;
      const H = Y instanceof Error ? Y.message : "Failed to update guide";
      c(H);
    }
  }, R = async () => {
    if (!g || !i) return;
    const w = je(), O = E === "automatic" ? null : S?.xpath ?? (S?.selector?.startsWith("/") || S?.selector?.startsWith("//") ? S?.selector : null) ?? null, K = te.slice().sort((H, ye) => H.step_order - ye.step_order).map((H) => {
      const ye = H.map_id === p;
      let Xe = H.x_path;
      ye && (Xe = Z === "floating" ? null : l || o || H.x_path);
      const St = !Xe;
      return {
        template_id: H.template_id,
        step_order: H.step_order,
        url: ye ? w : H.url ?? w,
        x_path: Xe,
        auto_click_target: ye ? U : H.auto_click_target ?? !1,
        content: ye ? $(Re(H), St) : Re(H)
      };
    }), Y = {
      guide_name: g.guide_name ?? "",
      description: g.description ?? "",
      target_segment: O,
      guide_category: g.guide_category ?? null,
      target_page: w,
      type: g.type ?? "modal",
      trigger_type: E === "automatic" ? "page_load" : "click",
      is_auto: E === "automatic",
      ignore_throttling: g.ignore_throttling ?? !1,
      repeat_on_dismiss: g.repeat_on_dismiss ?? !1,
      repeat_interval: g.repeat_interval ?? null,
      repeat_unit: g.repeat_unit ?? null,
      expiration_type: g.expiration_type ?? null,
      expiration_value: g.expiration_value ?? null,
      repeat_days: Lt(g.repeat_days),
      status: g.status ?? "draft",
      priority: g.priority ?? 0,
      templates: K
    };
    c("");
    try {
      await oe.mutateAsync({ guideId: i, payload: Y }), qe(), de(!0), setTimeout(() => {
        de(!1), x(!1);
      }, 1200);
    } catch (H) {
      const ye = H instanceof Error ? H.message : "Failed to update guide";
      c(ye);
    }
  }, z = async (w) => {
    if (!g || !i) return;
    const O = je(), K = te.slice().sort((H, ye) => H.step_order - ye.step_order).map((H) => ({
      template_id: H.template_id,
      step_order: H.step_order,
      url: H.url ?? O,
      x_path: H.x_path,
      auto_click_target: H.auto_click_target ?? !1,
      content: Re(H)
    })), Y = {
      guide_name: g.guide_name ?? "",
      description: g.description ?? "",
      target_segment: g.target_segment ?? null,
      guide_category: g.guide_category ?? null,
      target_page: g.target_page ?? O,
      type: g.type ?? "modal",
      trigger_type: g.trigger_type ?? null,
      is_auto: g.is_auto ?? g.trigger_type === "page_load",
      ignore_throttling: g.ignore_throttling ?? !1,
      repeat_on_dismiss: g.repeat_on_dismiss ?? !1,
      repeat_interval: g.repeat_interval ?? null,
      repeat_unit: g.repeat_unit ?? null,
      expiration_type: g.expiration_type ?? null,
      expiration_value: g.expiration_value ?? null,
      repeat_days: Lt(g.repeat_days),
      status: w,
      priority: g.priority ?? 0,
      templates: K
    };
    Se(w), c("");
    try {
      await oe.mutateAsync({ guideId: i, payload: Y }), Ie(!0), setTimeout(() => Ie(!1), 2e3);
    } catch (H) {
      const ye = g.status;
      Se(["draft", "active", "inactive", "archived"].includes(ye) ? ye : "draft");
      const Xe = H instanceof Error ? H.message : "Failed to update status";
      c(Xe);
    }
  }, Te = async (w) => {
    if (!g || !i) return;
    const O = je(), K = te.slice().sort((Y, H) => Y.step_order - H.step_order).map((Y) => ({
      template_id: Y.template_id,
      step_order: Y.step_order,
      url: Y.url ?? O,
      x_path: Y.x_path,
      auto_click_target: Y.auto_click_target ?? !1,
      content: Re(Y)
    }));
    await oe.mutateAsync({
      guideId: i,
      payload: {
        guide_name: g.guide_name ?? "",
        description: g.description ?? "",
        target_segment: g.target_segment ?? null,
        guide_category: g.guide_category ?? null,
        target_page: g.target_page ?? O,
        type: g.type ?? "modal",
        trigger_type: g.trigger_type ?? null,
        is_auto: g.is_auto ?? g.trigger_type === "page_load",
        status: g.status ?? "draft",
        priority: g.priority ?? 0,
        ...w,
        templates: K
      }
    });
  }, Ue = !!i && !!g, Ve = l || o || V?.x_path || "", lt = S?.xpath ?? S?.selector ?? "";
  return /* @__PURE__ */ n("div", { style: f.root, children: [
    me && V && /* @__PURE__ */ n(
      No,
      {
        initialContent: be ?? Re(V),
        stepLabel: C(V) || `Step ${He + 1}`,
        surveyMode: g?.type === "survey",
        onSave: (w) => {
          ce(w), W(!1), t({ type: "COLLAPSE_FROM_FULLSCREEN" });
        },
        onClose: () => {
          W(!1), t({ type: "COLLAPSE_FROM_FULLSCREEN" });
        },
        onPreview: (w, O) => {
          t({
            type: "PREVIEW_CONTENT",
            content: $(w, Z === "floating"),
            xpath: Q === "banner" ? null : l || V.x_path || null,
            layoutMode: Q === "banner" ? "floating" : Z,
            position: Q === "banner" ? Ae : _e,
            guideType: O || g?.type
          });
        }
      }
    ),
    /* @__PURE__ */ n("div", { style: f.header, children: [
      /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.25rem" }, children: [
        /* @__PURE__ */ n("h2", { style: f.headerTitle, children: _ ? "Configure Trigger" : I ? "Activation Settings" : Ue ? g?.guide_name ?? "Guide" : "Create Guide" }),
        _ && g?.guide_name && /* @__PURE__ */ n("span", { style: { fontSize: "0.75rem", color: "#94a3b8" }, children: [
          'for "',
          g.guide_name,
          '"'
        ] })
      ] }),
      /* @__PURE__ */ n(G, { variant: "icon", onClick: () => t({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    I ? /* @__PURE__ */ n(
      Mo,
      {
        onBack: () => k(!1),
        guideName: g?.guide_name,
        initialIgnoreThrottling: g?.ignore_throttling ?? !1,
        initialRepeatOnDismiss: g?.repeat_on_dismiss ?? !1,
        initialRepeatInterval: g?.repeat_interval ?? 1,
        initialRepeatUnit: g?.repeat_unit ?? "day",
        initialExpirationType: g?.expiration_type ?? "never",
        initialExpirationValue: g?.expiration_value ?? 2,
        initialRepeatDays: g?.repeat_days ?? null,
        onSave: Te
      }
    ) : _ ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ n(
        G,
        {
          variant: "secondary",
          style: { alignSelf: "flex-start" },
          onClick: () => {
            P(!1), x(!1), T(null), t({ type: "CLEAR_SELECTION_CLICKED" });
          },
          children: [
            /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left", style: { marginRight: "0.4rem" } }),
            "Back to Steps"
          ]
        }
      ),
      g?.target_segment && g.target_segment !== "None" && /* @__PURE__ */ n("div", { style: f.section, children: [
        /* @__PURE__ */ n("label", { style: f.label, children: "Currently triggers on" }),
        /* @__PURE__ */ n("div", { style: {
          ...f.selectorBox,
          marginTop: "0.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:cursor-default-click", style: { fontSize: "0.9rem", color: "#3b82f6", flexShrink: 0 } }),
          /* @__PURE__ */ n("span", { title: g.target_segment, style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: g.target_segment.length > 55 ? g.target_segment.slice(0, 55) + "…" : g.target_segment })
        ] })
      ] }),
      /* @__PURE__ */ n("div", { style: f.section, children: [
        /* @__PURE__ */ n("label", { style: f.label, children: "When should this guide appear?" }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }, children: ["automatic", "on_click"].map((w) => {
          const O = E === w;
          return /* @__PURE__ */ n(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: O ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                background: O ? "rgba(59,130,246,0.05)" : "#fff",
                cursor: "pointer"
              },
              children: [
                /* @__PURE__ */ n(
                  "input",
                  {
                    type: "radio",
                    name: "triggerAction",
                    value: w,
                    checked: O,
                    onChange: () => v(w),
                    style: { marginTop: "0.1rem", accentColor: "#3b82f6" }
                  }
                ),
                /* @__PURE__ */ n("div", { children: [
                  /* @__PURE__ */ n("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }, children: w === "automatic" ? "On page load" : "When an element is clicked" }),
                  /* @__PURE__ */ n("div", { style: { fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.125rem" }, children: w === "automatic" ? "Guide appears automatically when the page loads" : "Guide appears when a specific element is clicked" })
                ] })
              ]
            },
            w
          );
        }) })
      ] }),
      E === "on_click" && /* @__PURE__ */ n("div", { style: f.section, children: [
        /* @__PURE__ */ n("label", { style: f.label, children: "Which element triggers this guide?" }),
        S ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }, children: [
          /* @__PURE__ */ n("div", { style: {
            padding: "0.75rem",
            border: "1px solid #bbf7d0",
            borderRadius: "0.75rem",
            background: "#f0fdf4"
          }, children: [
            /* @__PURE__ */ n("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#166534" }, children: [
              S.elementInfo?.tagName?.toLowerCase() ?? "element",
              S.elementInfo?.textContent && /* @__PURE__ */ n("span", { style: { fontWeight: 400, color: "#15803d" }, children: [
                " ",
                '· "',
                S.elementInfo.textContent.slice(0, 30),
                '"'
              ] })
            ] }),
            S.elementInfo?.id && /* @__PURE__ */ n("div", { style: { fontSize: "0.7rem", color: "#4ade80", marginTop: "0.125rem" }, children: [
              "#",
              S.elementInfo.id
            ] }),
            /* @__PURE__ */ n("div", { style: { marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#86efac", wordBreak: "break-all" }, children: [
              lt.slice(0, 60),
              lt.length > 60 ? "…" : ""
            ] })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem" }, children: [
            /* @__PURE__ */ n(
              G,
              {
                variant: "secondary",
                style: { flex: 1 },
                onClick: () => {
                  P(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: [
                  /* @__PURE__ */ n("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.3rem" } }),
                  "Change"
                ]
              }
            ),
            F && /* @__PURE__ */ n(
              G,
              {
                variant: "secondary",
                onClick: () => {
                  P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Done"
              }
            ),
            g?.target_segment && g.target_segment !== "None" && /* @__PURE__ */ n(
              G,
              {
                variant: "secondary",
                style: { borderColor: "#fca5a5", color: "#dc2626" },
                onClick: () => {
                  P(!1), T(null), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Clear"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ n(
          G,
          {
            variant: F ? "primary" : "secondary",
            style: { marginTop: "0.25rem" },
            onClick: () => {
              P(!0), t({ type: "ACTIVATE_SELECTOR" });
            },
            children: [
              /* @__PURE__ */ n("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.4rem" } }),
              F ? "Click an element on the page…" : "Select element"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { style: { ...f.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ n(
        G,
        {
          variant: "primary",
          style: { flex: 1 },
          onClick: R,
          disabled: oe.isPending || ve,
          children: oe.isPending ? "Saving…" : ve ? "✓ Trigger saved" : "Save Trigger"
        }
      ) }),
      h && /* @__PURE__ */ n("div", { style: f.errorBox, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle" }),
        h
      ] })
    ] }) : (
      /* ── Main Step Editor ── */
      /* @__PURE__ */ n(ee, { children: i && M ? /* @__PURE__ */ n("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "2rem", color: "#3b82f6" } }),
        /* @__PURE__ */ n("p", { style: f.emptyStateText, children: "Loading guide…" })
      ] }) : i && !g ? /* @__PURE__ */ n("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle", style: { fontSize: "2rem", color: "#94a3b8" } }),
        /* @__PURE__ */ n("p", { style: f.emptyStateText, children: "Guide not found." })
      ] }) : Ue && Pe.length > 0 ? /* @__PURE__ */ n(ee, { children: [
        /* @__PURE__ */ n("div", { style: f.section, children: [
          /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ n("label", { style: f.label, children: "Steps" }),
            /* @__PURE__ */ n("span", { style: { fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }, children: [
              He + 1,
              " of ",
              Pe.length
            ] })
          ] }),
          /* @__PURE__ */ n("div", { style: {
            display: "flex",
            gap: "0.4rem",
            overflowX: "auto",
            paddingBottom: "0.25rem",
            marginTop: "0.4rem"
          }, children: Pe.map((w, O) => {
            const K = p === w.map_id, Y = C(w) || `Step ${O + 1}`;
            return /* @__PURE__ */ n(
              "button",
              {
                onClick: () => m(w.map_id),
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "9999px",
                  border: K ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  background: K ? "rgba(59,130,246,0.08)" : "#f8fafc",
                  color: K ? "#1d4ed8" : "#64748b",
                  fontSize: "0.78rem",
                  fontWeight: K ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontFamily: f.root.fontFamily
                },
                children: [
                  /* @__PURE__ */ n("span", { style: { opacity: 0.55, fontSize: "0.7rem" }, children: O + 1 }),
                  Y.length > 20 ? Y.slice(0, 20) + "…" : Y
                ]
              },
              w.map_id
            );
          }) })
        ] }),
        /* @__PURE__ */ n("div", { style: f.section, children: [
          /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [
            /* @__PURE__ */ n("label", { style: f.label, children: "Guide Status" }),
            $e && /* @__PURE__ */ n("span", { style: { fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }, children: "✓ Saved" })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.4rem" }, children: jo.map((w) => {
            const O = Ye === w.value;
            return /* @__PURE__ */ n(
              "button",
              {
                onClick: () => z(w.value),
                disabled: oe.isPending,
                style: {
                  flex: 1,
                  padding: "0.5rem 0.25rem",
                  borderRadius: "0.625rem",
                  border: `2px solid ${O ? w.border : "#e2e8f0"}`,
                  background: O ? w.bg : "#f8fafc",
                  color: O ? w.color : "#94a3b8",
                  fontSize: "0.72rem",
                  fontWeight: O ? 700 : 500,
                  cursor: oe.isPending ? "not-allowed" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.2rem",
                  transition: "all 0.15s",
                  fontFamily: f.root.fontFamily,
                  opacity: oe.isPending ? 0.6 : 1
                },
                children: [
                  /* @__PURE__ */ n("iconify-icon", { icon: w.icon, style: { fontSize: "1rem" } }),
                  w.label
                ]
              },
              w.value
            );
          }) })
        ] }),
        /* @__PURE__ */ n("div", { style: f.section, children: [
          /* @__PURE__ */ n("label", { style: f.label, children: "Content" }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem" }, children: [
            /* @__PURE__ */ n(
              G,
              {
                variant: "secondary",
                style: { flex: 1 },
                onClick: () => {
                  t({ type: "EXPAND_TO_FULLSCREEN" }), W(!0);
                },
                children: [
                  /* @__PURE__ */ n("iconify-icon", { icon: "mdi:pencil-outline", style: { marginRight: "0.4rem" } }),
                  "Edit Content"
                ]
              }
            ),
            /* @__PURE__ */ n(
              G,
              {
                variant: "secondary",
                style: { flexShrink: 0 },
                onClick: () => {
                  if (!V) return;
                  const w = be ?? Re(V);
                  t({
                    type: "PREVIEW_CONTENT",
                    content: $(w, Z === "floating"),
                    xpath: Q === "banner" ? null : l || V.x_path || null,
                    layoutMode: Q === "banner" ? "floating" : Z,
                    position: Q === "banner" ? Ae : _e,
                    guideType: g?.type
                  });
                },
                title: "Preview on page",
                children: [
                  /* @__PURE__ */ n("iconify-icon", { icon: "mdi:eye-outline", style: { fontSize: "1rem" } }),
                  " Preview"
                ]
              }
            )
          ] }),
          be && /* @__PURE__ */ n("div", { style: {
            fontSize: "0.72rem",
            color: "#f59e0b",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            marginTop: "0.1rem"
          }, children: [
            /* @__PURE__ */ n("iconify-icon", { icon: "mdi:circle", style: { fontSize: "0.5rem" } }),
            "Unsaved content changes — click Save Step to commit"
          ] })
        ] }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
          /* @__PURE__ */ n("div", { style: f.section, children: [
            /* @__PURE__ */ n("label", { style: f.label, children: "Layout" }),
            /* @__PURE__ */ n(
              "select",
              {
                value: Z,
                onChange: (w) => {
                  const O = w.target.value;
                  N(O), O === "floating" ? ie() : !l && !o && !V?.x_path && (P(!0), t({ type: "ACTIVATE_SELECTOR" }));
                },
                style: {
                  width: "100%",
                  marginTop: "0.25rem",
                  padding: "0.625rem 1rem",
                  fontFamily: f.root.fontFamily,
                  fontSize: "0.875rem",
                  color: "#334155",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  background: "#fff",
                  cursor: "pointer"
                },
                children: [
                  /* @__PURE__ */ n("option", { value: "anchored", children: "Anchored to Element (Tooltip)" }),
                  /* @__PURE__ */ n("option", { value: "floating", children: "Floating on Page" })
                ]
              }
            )
          ] }),
          Z === "floating" && /* @__PURE__ */ n("div", { style: f.section, children: [
            /* @__PURE__ */ n("label", { style: f.label, children: "Style" }),
            /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem", marginTop: "0.25rem" }, children: ["modal", "banner"].map((w) => {
              const O = Q === w;
              return /* @__PURE__ */ n(
                "button",
                {
                  onClick: () => X(w),
                  style: {
                    flex: 1,
                    padding: "0.6rem",
                    borderRadius: "0.75rem",
                    border: `2px solid ${O ? "#3b82f6" : "#e2e8f0"}`,
                    background: O ? "rgba(59,130,246,0.08)" : "#f8fafc",
                    color: O ? "#1d4ed8" : "#94a3b8",
                    fontSize: "0.78rem",
                    fontWeight: O ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.35rem",
                    fontFamily: f.root.fontFamily,
                    transition: "all 0.15s"
                  },
                  children: [
                    /* @__PURE__ */ n(
                      "iconify-icon",
                      {
                        icon: w === "modal" ? "mdi:card-outline" : "mdi:dock-top",
                        style: { fontSize: "1rem" }
                      }
                    ),
                    w === "modal" ? "Modal" : "Banner"
                  ]
                },
                w
              );
            }) })
          ] }),
          Z === "anchored" ? (
            /* ── Anchored: element picker ── */
            /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
              /* @__PURE__ */ n("label", { style: f.label, children: "Target Element" }),
              u ? (
                /* State 1: freshly selected from page (has local elementInfo) */
                /* @__PURE__ */ n("div", { style: {
                  position: "relative",
                  padding: "0.75rem",
                  border: "1px solid #bfdbfe",
                  borderRadius: "0.75rem",
                  background: "rgba(239,246,255,0.6)"
                }, children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }, children: [
                  /* @__PURE__ */ n("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ n("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }, children: [
                      /* @__PURE__ */ n("span", { children: u.tagName.toLowerCase() }),
                      u.textContent && /* @__PURE__ */ n("span", { style: { fontWeight: 400, color: "#475569" }, children: [
                        " ",
                        '· "',
                        u.textContent.slice(0, 30),
                        u.textContent.length > 30 ? "…" : "",
                        '"'
                      ] })
                    ] }),
                    u.id && /* @__PURE__ */ n("div", { style: { fontSize: "0.72rem", color: "#93c5fd", marginTop: "0.1rem" }, children: [
                      "#",
                      u.id
                    ] }),
                    /* @__PURE__ */ n("div", { style: { marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#94a3b8", wordBreak: "break-all" }, children: Ve.length > 60 ? Ve.slice(0, 60) + "…" : Ve })
                  ] }),
                  /* @__PURE__ */ n(
                    "button",
                    {
                      onClick: qe,
                      title: "Discard this selection",
                      style: {
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        padding: "0.2rem 0.45rem",
                        borderRadius: "0.4rem",
                        border: "1px solid #fca5a5",
                        background: "#fff1f2",
                        color: "#dc2626",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: f.root.fontFamily
                      },
                      children: [
                        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "0.68rem" } }),
                        "Cancel"
                      ]
                    }
                  )
                ] }) })
              ) : V?.x_path ? (
                /* State 2: saved from API — no local edit in progress */
                /* @__PURE__ */ n("div", { style: {
                  position: "relative",
                  padding: "0.75rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  background: "#f8fafc"
                }, children: [
                  /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                    /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.4rem" }, children: [
                      /* @__PURE__ */ n("iconify-icon", { icon: "mdi:check-circle", style: { fontSize: "0.85rem", color: "#22c55e" } }),
                      /* @__PURE__ */ n("span", { style: { fontSize: "0.8rem", fontWeight: 600, color: "#334155" }, children: "Element saved" })
                    ] }),
                    /* @__PURE__ */ n(
                      "button",
                      {
                        onClick: we,
                        title: "Remove target element (step becomes floating)",
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "0.4rem",
                          border: "1px solid #fca5a5",
                          background: "#fff1f2",
                          color: "#dc2626",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: f.root.fontFamily
                        },
                        children: [
                          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "0.7rem" } }),
                          "Clear"
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("div", { style: { marginTop: "0.35rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#94a3b8", wordBreak: "break-all" }, children: V.x_path.length > 60 ? V.x_path.slice(0, 60) + "…" : V.x_path })
                ] })
              ) : (
                /* State 3: nothing selected yet */
                /* @__PURE__ */ n("div", { style: {
                  padding: "0.75rem",
                  border: "1px solid #fed7aa",
                  borderRadius: "0.75rem",
                  background: "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }, children: [
                  /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle-outline", style: { fontSize: "1rem", color: "#f97316", flexShrink: 0 } }),
                  /* @__PURE__ */ n("span", { style: { fontSize: "0.8rem", color: "#c2410c" }, children: 'No element selected — use "Select Element" below' })
                ] })
              ),
              /* @__PURE__ */ n("div", { style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.625rem 0.75rem",
                border: "1px solid #e2e8f0",
                borderRadius: "0.75rem",
                background: "#fafafa"
              }, children: [
                /* @__PURE__ */ n("div", { children: [
                  /* @__PURE__ */ n("div", { style: { fontSize: "0.8rem", fontWeight: 600, color: "#334155" }, children: "Auto-click on Next" }),
                  /* @__PURE__ */ n("div", { style: { fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.1rem" }, children: "Clicks this element when user advances" })
                ] }),
                /* @__PURE__ */ n(
                  "button",
                  {
                    onClick: () => q(!U),
                    style: f.toggle(U),
                    "aria-label": "Toggle auto-click",
                    children: /* @__PURE__ */ n("div", { style: f.toggleThumb(U) })
                  }
                )
              ] }),
              /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem" }, children: [
                /* @__PURE__ */ n(
                  G,
                  {
                    variant: F ? "primary" : "secondary",
                    style: { flex: 1 },
                    onClick: () => {
                      P(!0), t({ type: "ACTIVATE_SELECTOR" });
                    },
                    children: [
                      /* @__PURE__ */ n("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.3rem" } }),
                      Ve ? "Change Element" : "Select Element"
                    ]
                  }
                ),
                F && /* @__PURE__ */ n(
                  G,
                  {
                    variant: "secondary",
                    onClick: () => {
                      P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                    },
                    children: "Done"
                  }
                )
              ] })
            ] })
          ) : Q === "modal" ? (
            /* ── Floating Modal: 3×3 position grid ── */
            /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
              /* @__PURE__ */ n("label", { style: f.label, children: "Position on screen" }),
              /* @__PURE__ */ n("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", marginTop: "0.25rem" }, children: qo.map((w, O) => {
                if (!w)
                  return /* @__PURE__ */ n("div", {}, O);
                const K = _e === w;
                return /* @__PURE__ */ n(
                  "button",
                  {
                    onClick: () => se(w),
                    title: gn[w],
                    style: {
                      aspectRatio: "1.4 / 1",
                      borderRadius: "0.6rem",
                      border: K ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      background: K ? "rgba(59,130,246,0.08)" : "#f8fafc",
                      color: K ? "#1d4ed8" : "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.15rem",
                      fontFamily: f.root.fontFamily,
                      transition: "all 0.15s"
                    },
                    children: [
                      /* @__PURE__ */ n("span", { style: { fontSize: "1rem", lineHeight: 1 }, children: Vo[w] }),
                      /* @__PURE__ */ n("span", { style: { fontSize: "0.6rem", fontWeight: K ? 700 : 500 }, children: gn[w] })
                    ]
                  },
                  w
                );
              }) })
            ] })
          ) : (
            /* ── Floating Banner: top / bottom picker ── */
            /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
              /* @__PURE__ */ n("label", { style: f.label, children: "Banner position" }),
              /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem", marginTop: "0.25rem" }, children: ["top", "bottom"].map((w) => {
                const O = Ae === w;
                return /* @__PURE__ */ n(
                  "button",
                  {
                    onClick: () => ke(w),
                    style: {
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "0.75rem",
                      border: `2px solid ${O ? "#3b82f6" : "#e2e8f0"}`,
                      background: O ? "rgba(59,130,246,0.08)" : "#f8fafc",
                      color: O ? "#1d4ed8" : "#94a3b8",
                      fontSize: "0.78rem",
                      fontWeight: O ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                      fontFamily: f.root.fontFamily,
                      transition: "all 0.15s"
                    },
                    children: [
                      /* @__PURE__ */ n(
                        "iconify-icon",
                        {
                          icon: w === "top" ? "mdi:dock-top" : "mdi:dock-bottom",
                          style: { fontSize: "1rem" }
                        }
                      ),
                      w === "top" ? "Top" : "Bottom"
                    ]
                  },
                  w
                );
              }) })
            ] })
          ),
          /* @__PURE__ */ n("div", { style: { marginTop: "0.25rem" }, children: /* @__PURE__ */ n(
            G,
            {
              variant: "primary",
              style: { width: "100%", height: "42px" },
              onClick: L,
              disabled: oe.isPending || he,
              children: oe.isPending ? "Saving…" : he ? "✓ Step saved" : "Save Step"
            }
          ) })
        ] }),
        /* @__PURE__ */ n("div", { style: f.actionRow, children: [
          /* @__PURE__ */ n(
            G,
            {
              variant: "secondary",
              style: { flex: 1 },
              onClick: () => x(!0),
              children: [
                /* @__PURE__ */ n("iconify-icon", { icon: "mdi:lightning-bolt", style: { marginRight: "0.4rem", color: "#f59e0b" } }),
                "Set Trigger"
              ]
            }
          ),
          /* @__PURE__ */ n(
            G,
            {
              variant: "secondary",
              style: { flex: 1 },
              onClick: () => k(!0),
              children: [
                /* @__PURE__ */ n("iconify-icon", { icon: "mdi:clock-outline", style: { marginRight: "0.4rem", color: "#3b82f6" } }),
                "Activation"
              ]
            }
          )
        ] }),
        h && /* @__PURE__ */ n("div", { style: f.errorBox, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle" }),
          h
        ] })
      ] }) : null })
    )
  ] });
}
function ht({
  type: t = "text",
  value: e,
  onInput: i,
  placeholder: r,
  id: o,
  style: s,
  disabled: l,
  "aria-label": a
}) {
  const u = s ? { ...f.input, ...s } : f.input;
  return /* @__PURE__ */ n(
    "input",
    {
      type: t,
      value: e,
      onInput: i,
      placeholder: r,
      id: o,
      style: u,
      disabled: l,
      "aria-label": a
    }
  );
}
function Zn({
  value: t,
  onInput: e,
  placeholder: i,
  id: r,
  minHeight: o,
  style: s,
  disabled: l,
  "aria-label": a
}) {
  const u = s ? { ...f.textarea, ...s, ...o != null && { minHeight: typeof o == "number" ? `${o}px` : o } } : o != null ? { ...f.textarea, minHeight: typeof o == "number" ? `${o}px` : o } : f.textarea;
  return /* @__PURE__ */ n(
    "textarea",
    {
      value: t,
      onInput: e,
      placeholder: i,
      id: r,
      style: u,
      disabled: l,
      "aria-label": a
    }
  );
}
const Ko = ["pages", "create"];
async function Yo(t) {
  return Oe.post("/pages", {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: "active"
  });
}
function Xo() {
  return ot({
    mutationKey: Ko,
    mutationFn: Yo
  });
}
const Jo = ["pages", "update"];
async function Zo({ pageId: t, payload: e }) {
  return Oe.put(`/pages/${t}`, {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: e.status ?? "active"
  });
}
function es() {
  return ot({
    mutationKey: Jo,
    mutationFn: Zo
  });
}
const ts = ["pages", "delete"];
async function is(t) {
  return Oe.delete(`/pages/${t}`);
}
function ns() {
  return ot({
    mutationKey: ts,
    mutationFn: is
  });
}
const rs = (t) => ["pages", "check-slug", t];
async function os(t) {
  return Oe.get(`/pages/check-slug?slug=${encodeURIComponent(t)}`);
}
function ss(t) {
  return Ht({
    queryKey: rs(t),
    queryFn: () => os(t),
    enabled: !!t,
    retry: 0
  });
}
const as = ["pages", "list"];
async function ls() {
  return Oe.get("/pages");
}
function cs() {
  return Ht({
    queryKey: as,
    queryFn: ls,
    retry: 0
  });
}
const ds = "designerTaggedPages", At = ["pages", "check-slug"], Xt = ["pages", "list"];
function Pt() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (e.host || e.hostname || "") + (e.pathname || "/") + (e.search || "") + (e.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function Ft() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (e.pathname || "/").replace(/^\//, ""), r = e.search || "", o = e.hash || "";
    return "//*/" + i + r + o;
  } catch {
    return "//*/";
  }
}
function us({ onMessage: t }) {
  const [e, i] = b("overviewUntagged"), [r, o] = b(""), [s, l] = b(""), [a, u] = b(""), [d, h] = b(!1), [c, p] = b("create"), [m, _] = b(""), [x, I] = b(""), [k, E] = b("suggested"), [v, S] = b(""), [T, F] = b(!1), [P, U] = b(null), [q, Z] = b(!1), N = xt(), Q = Xo(), X = es(), _e = ns(), { data: se, isLoading: Ae, isError: ke } = ss(r), { data: be, isLoading: ce } = cs(), me = !!r && Ae, W = Q.isPending || X.isPending, he = (r || "").trim().toLowerCase(), ve = (be?.data ?? []).filter((M) => (M.slug || "").trim().toLowerCase() === he).filter(
    (M) => (M.name || "").toLowerCase().includes(a.toLowerCase().trim())
  ), de = De(() => {
    i("overviewUntagged"), l(Pt() || "(current page)"), h(!1), N.invalidateQueries({ queryKey: At });
  }, [N]), $e = De(() => {
    i("taggedPagesDetailView"), u("");
  }, []), Ie = De(() => {
    U(null), i("tagPageFormView"), h(!0), S(Ft()), _(""), I(""), p("create"), E("suggested"), F(!1);
  }, []), Ye = De((M) => {
    U(M.page_id), i("tagPageFormView"), h(!0), S(M.slug || Ft()), _(M.name || ""), I(M.description || ""), p("create"), E("suggested"), F(!1);
  }, []);
  pe(() => {
    t({ type: "EDITOR_READY" });
  }, []), pe(() => {
    o(Ft()), l(Pt() || "(current page)");
  }, []), pe(() => {
    if (!r) {
      i("overviewUntagged");
      return;
    }
    if (ke) {
      (e === "overviewTagged" || e === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    se !== void 0 && (e === "overviewTagged" || e === "overviewUntagged") && i(se.exists ? "overviewTagged" : "overviewUntagged");
  }, [r, se, ke, e]), pe(() => {
    let M = Pt();
    const g = () => {
      const V = Pt();
      V !== M && (M = V, o(Ft()), l(V || "(current page)"), i("overviewUntagged"));
    }, te = () => g(), oe = () => g();
    window.addEventListener("hashchange", te), window.addEventListener("popstate", oe);
    const Pe = setInterval(g, 1500);
    return () => {
      window.removeEventListener("hashchange", te), window.removeEventListener("popstate", oe), clearInterval(Pe);
    };
  }, []);
  const Se = async () => {
    const M = m.trim();
    if (!M) {
      F(!0);
      return;
    }
    F(!1);
    const g = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, te = v.trim() || g || "/";
    try {
      if (P)
        await X.mutateAsync({
          pageId: P,
          payload: {
            name: M,
            slug: te,
            description: x.trim() || void 0,
            status: "active"
          }
        }), U(null), N.invalidateQueries({ queryKey: At }), N.invalidateQueries({ queryKey: Xt }), de();
      else {
        const oe = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, Pe = v.trim() || oe;
        await Q.mutateAsync({
          name: M,
          slug: te,
          description: x.trim() || void 0
        });
        const V = ds, He = localStorage.getItem(V) || "[]", C = JSON.parse(He);
        C.push({ pageName: M, url: Pe }), localStorage.setItem(V, JSON.stringify(C)), N.invalidateQueries({ queryKey: At }), N.invalidateQueries({ queryKey: Xt }), i("overviewTagged"), h(!1);
      }
    } catch {
    }
  }, ge = async (M) => {
    if (window.confirm("Delete this page?"))
      try {
        await _e.mutateAsync(M), N.invalidateQueries({ queryKey: At }), N.invalidateQueries({ queryKey: Xt });
      } catch {
      }
  }, xe = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return q ? /* @__PURE__ */ n("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ n("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ n("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ n(G, { variant: "icon", title: "Expand", onClick: () => Z(!1), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ n("div", { style: f.panel, children: [
    /* @__PURE__ */ n("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ n("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ n(G, { variant: "icon", title: "Minimize", onClick: () => Z(!0), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ n("div", { style: f.panelBody, children: [
      me && (e === "overviewTagged" || e === "overviewUntagged") && /* @__PURE__ */ n("div", { style: { ...xe, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ n("span", { children: "Checking page…" })
      ] }),
      !me && e === "overviewTagged" && /* @__PURE__ */ n("div", { style: xe, children: [
        /* @__PURE__ */ n("div", { style: f.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ n("div", { style: { ...f.card, marginBottom: "1rem", cursor: "pointer" }, onClick: $e, children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ n("span", { style: { ...f.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ n("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: s })
            ] })
          ] }),
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ n(G, { variant: "primary", style: { width: "100%" }, onClick: Ie, children: "Tag Page" })
      ] }),
      e === "taggedPagesDetailView" && /* @__PURE__ */ n("div", { style: xe, children: [
        /* @__PURE__ */ n(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (M) => {
              M.preventDefault(), de();
            },
            children: [
              /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ n("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: ce ? "…" : ve.length }),
          /* @__PURE__ */ n("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ n("div", { style: f.searchWrap, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
          /* @__PURE__ */ n(
            ht,
            {
              type: "text",
              placeholder: "Search Pages",
              value: a,
              onInput: (M) => u(M.target.value),
              style: f.searchInput
            }
          ),
          a && /* @__PURE__ */ n(G, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => u(""), children: "Clear" })
        ] }),
        ce ? /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ n("span", { children: "Loading pages…" })
        ] }) : ve.map((M) => /* @__PURE__ */ n("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: M.name || "Unnamed" }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ n(G, { variant: "iconSm", title: "Edit", onClick: () => Ye(M), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ n(G, { variant: "iconSm", title: "Delete", onClick: () => ge(M.page_id), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, M.page_id)),
        /* @__PURE__ */ n(G, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: Ie, children: "Tag Page" })
      ] }),
      !me && e === "overviewUntagged" && /* @__PURE__ */ n("div", { style: { ...xe, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ n("div", { style: { ...f.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ n("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ n(G, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: Ie, children: "Tag Page" })
      ] }),
      e === "tagPageFormView" && /* @__PURE__ */ n("div", { style: { ...xe, gap: "1.5rem" }, children: [
        /* @__PURE__ */ n(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (M) => {
              M.preventDefault(), U(null), de(), h(!1);
            },
            children: [
              /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back"
            ]
          }
        ),
        /* @__PURE__ */ n("div", { children: [
          /* @__PURE__ */ n("div", { style: f.sectionLabel, children: P ? "EDIT PAGE" : "PAGE SETUP" }),
          !P && /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "pageSetup", value: "create", checked: c === "create", onChange: () => p("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create New Page" })
            ] }),
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "pageSetup", value: "merge", checked: c === "merge", onChange: () => p("merge"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Merge with Existing" })
            ] })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }, children: [
            /* @__PURE__ */ n("div", { children: [
              /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: [
                "Page Name ",
                /* @__PURE__ */ n("span", { style: { color: "#ef4444" }, children: "*" })
              ] }),
              /* @__PURE__ */ n(
                ht,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: m,
                  onInput: (M) => _(M.target.value)
                }
              ),
              T && /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ n("div", { children: [
              /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ n(
                Zn,
                {
                  placeholder: "Click to add description",
                  value: x,
                  onInput: (M) => I(M.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ n("div", { children: [
          /* @__PURE__ */ n("div", { style: { ...f.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "INCLUDE PAGE RULES",
            /* @__PURE__ */ n("span", { style: { color: "#94a3b8" }, title: "Define how this page is identified", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }, children: [
            /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#334155" }, children: "Include Rule 1" }),
            /* @__PURE__ */ n(G, { variant: "iconSm", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "ruleType", value: "suggested", checked: k === "suggested", onChange: () => E("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "ruleType", value: "exact", checked: k === "exact", onChange: () => E("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "ruleType", value: "builder", checked: k === "builder", onChange: () => E("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ n("div", { children: [
            /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ n(ht, { type: "text", placeholder: "e.g. //*/path/to/page", value: v, onInput: (M) => S(M.target.value) })
          ] })
        ] })
      ] })
    ] }),
    d && /* @__PURE__ */ n("div", { style: f.footer, children: [
      /* @__PURE__ */ n(
        G,
        {
          variant: "secondary",
          onClick: () => {
            U(null), de();
          },
          disabled: W,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ n(G, { variant: "primary", style: { flex: 1 }, onClick: Se, disabled: W, children: W ? /* @__PURE__ */ n(ee, { children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        P ? "Updating…" : "Saving…"
      ] }) : P ? "Update" : "Save" })
    ] })
  ] });
}
const hs = ["features", "create"];
async function ps(t) {
  return Oe.post("/features", t);
}
function fs() {
  return ot({
    mutationKey: hs,
    mutationFn: ps
  });
}
const ms = ["features", "update"];
async function gs({
  featureId: t,
  payload: e
}) {
  return Oe.put(`/features/${t}`, e);
}
function ys() {
  return ot({
    mutationKey: ms,
    mutationFn: gs
  });
}
const _s = ["features", "delete"];
async function bs(t) {
  return Oe.delete(`/features/${t}`);
}
function vs() {
  return ot({
    mutationKey: _s,
    mutationFn: bs
  });
}
const ut = ["features", "list"];
async function xs() {
  const t = await Oe.get("/features");
  return Array.isArray(t) ? { data: t } : t;
}
function Ss() {
  return Ht({
    queryKey: ut,
    queryFn: xs,
    retry: 0
  });
}
const yn = "designerHeatmapEnabled";
function ws({ onMessage: t, elementSelected: e }) {
  const [i, r] = b("overview"), [o, s] = b(!1), [l, a] = b(""), [u, d] = b(null), [h, c] = b(""), [p, m] = b(!1), [_, x] = b(!1), [I, k] = b(!1), [E, v] = b(!1), [S, T] = b(!1), [F, P] = b("create"), [U, q] = b("suggested"), [Z, N] = b(""), [Q, X] = b(""), [_e, se] = b(null), [Ae, ke] = b(null), [be, ce] = b(""), me = xt(), W = fs(), he = ys(), re = vs(), { data: ve, isLoading: de } = Ss(), $e = W.isPending || he.isPending || re.isPending, Ie = ve?.data ?? [], Ye = Ie.length, Se = Ie.filter((C) => (C.name || "").toLowerCase().includes(be.toLowerCase().trim())).sort((C, ie) => (C.name || "").localeCompare(ie.name || "", void 0, { sensitivity: "base" })), ge = De(() => {
    r("overview"), s(!1), a(""), d(null), X(""), c(""), m(!1), se(null), ce(""), me.invalidateQueries({ queryKey: ut });
  }, [me]), xe = De(() => {
    r("taggedList"), ce("");
  }, []), M = De((C) => C.rules?.find(
    (we) => we.selector_type === "xpath" && (we.selector_value ?? "").trim() !== ""
  )?.selector_value ?? "", []), g = De(
    (C) => {
      r("form"), s(!0), C ? (se(C.feature_id), c(C.name || ""), N(C.description || ""), X(M(C)), q("exact")) : (se(null), c(""), N(""), X(e?.xpath || ""), a(e?.selector || ""), d(e?.elementInfo || null)), m(!1);
    },
    [e, M]
  );
  pe(() => {
    t({ type: "EDITOR_READY" });
  }, []), pe(() => {
    t({ type: "FEATURES_FOR_HEATMAP", features: ve?.data ?? [] });
  }, [ve, t]), pe(() => {
    const C = localStorage.getItem(yn) === "true";
    x(C);
  }, []), pe(() => {
    e ? (a(e.selector), d(e.elementInfo), X(e.xpath || ""), s(!0), r("form"), c(""), m(!1), P("create"), N(""), q("exact")) : ge();
  }, [e]);
  const te = () => {
    const C = !_;
    x(C);
    try {
      localStorage.setItem(yn, String(C));
    } catch {
    }
    t({ type: "HEATMAP_TOGGLE", enabled: C });
  }, oe = () => {
    try {
      const ie = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
      return "//*/" + (ie.pathname || "/").replace(/^\//, "") + (ie.search || "") + (ie.hash || "");
    } catch {
      return "//*/";
    }
  }, Pe = async () => {
    const C = h.trim();
    if (!C) {
      m(!0);
      return;
    }
    m(!1);
    const ie = Q || e?.xpath || "";
    if (U === "exact") {
      if (!ie) return;
      const we = {
        name: C,
        slug: oe(),
        description: Z.trim() || "",
        status: "active",
        rules: [
          {
            selector_type: "xpath",
            selector_value: ie,
            match_mode: "exact",
            priority: 10,
            is_active: !0
          }
        ]
      };
      try {
        _e ? (await he.mutateAsync({ featureId: _e, payload: we }), me.invalidateQueries({ queryKey: ut }), ge()) : (await W.mutateAsync(we), me.invalidateQueries({ queryKey: ut }), ge());
      } catch {
      }
      return;
    }
  }, V = async (C) => {
    if (window.confirm("Delete this feature?")) {
      ke(C);
      try {
        await re.mutateAsync(C), me.invalidateQueries({ queryKey: ut }), _e === C && (se(null), ge());
      } catch {
      } finally {
        ke(null);
      }
    }
  }, He = (C) => {
    const ie = [];
    C.tagName && ie.push(`Tag: ${C.tagName}`), C.id && ie.push(`ID: ${C.id}`), C.className && ie.push(`Class: ${C.className}`);
    const we = (C.textContent || "").slice(0, 80);
    return we && ie.push(`Text: ${we}`), ie.join(" | ");
  };
  return I ? /* @__PURE__ */ n("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ n("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ n("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: o ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ n(G, { variant: "icon", title: "Expand", onClick: () => k(!1), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ n("div", { style: f.panel, children: [
    /* @__PURE__ */ n("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ n("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ n(G, { variant: "icon", title: "Minimize", onClick: () => k(!0), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ n("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: o ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ n("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ n("a", { href: "#", style: f.link, onClick: (C) => {
          C.preventDefault(), ge();
        }, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ n("div", { children: [
          /* @__PURE__ */ n("div", { style: f.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureSetup", checked: F === "create", onChange: () => P("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureSetup", checked: F === "merge", onChange: () => P("merge"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Merge with existing" })
            ] })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }, children: [
            /* @__PURE__ */ n("div", { children: [
              /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: [
                "Feature name ",
                /* @__PURE__ */ n("span", { style: { color: "#ef4444" }, children: "*" })
              ] }),
              /* @__PURE__ */ n(
                ht,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: h,
                  onInput: (C) => c(C.target.value)
                }
              ),
              p && /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a feature name."
              ] })
            ] }),
            /* @__PURE__ */ n("div", { children: [
              /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ n(
                Zn,
                {
                  placeholder: "Describe your Feature",
                  value: Z,
                  onInput: (C) => N(C.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ n("div", { children: [
          /* @__PURE__ */ n("div", { style: { ...f.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "FEATURE ELEMENT MATCHING",
            /* @__PURE__ */ n("span", { style: { color: "#94a3b8" }, title: "Match the element for this feature", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureMatch", checked: U === "suggested", onChange: () => q("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureMatch", checked: U === "ruleBuilder", onChange: () => q("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureMatch", checked: U === "customCss", onChange: () => q("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ n("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureMatch", checked: U === "exact", onChange: () => q("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ n("div", { children: [
            /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: U === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ n("div", { style: f.selectorBox, children: U === "exact" ? (e?.xpath ?? Q) || "-" : (e?.selector ?? l) || "-" })
          ] }),
          u && /* @__PURE__ */ n("div", { style: { marginTop: "1rem" }, children: [
            /* @__PURE__ */ n(
              "button",
              {
                type: "button",
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: 0,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left"
                },
                onClick: () => T((C) => !C),
                "aria-expanded": S,
                children: [
                  /* @__PURE__ */ n("label", { style: { ...f.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                  /* @__PURE__ */ n(
                    "iconify-icon",
                    {
                      icon: S ? "mdi:chevron-up" : "mdi:chevron-down",
                      style: { fontSize: "1.125rem", color: "#64748b", flexShrink: 0 }
                    }
                  )
                ]
              }
            ),
            S && /* @__PURE__ */ n("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ n("div", { style: f.elementInfoText, children: He(u) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ n("div", { style: f.footer, children: [
        /* @__PURE__ */ n(G, { variant: "secondary", onClick: ge, children: "Cancel" }),
        /* @__PURE__ */ n(G, { variant: "primary", style: { flex: 1 }, onClick: Pe, disabled: $e, children: $e ? "Saving..." : "Save" })
      ] })
    ] }) : /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i === "taggedList" ? /* @__PURE__ */ n(ee, { children: [
      /* @__PURE__ */ n(
        "a",
        {
          href: "#",
          style: f.link,
          onClick: (C) => {
            C.preventDefault(), ge();
          },
          children: [
            /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left" }),
            " Back to overview"
          ]
        }
      ),
      /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ n("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: de ? "…" : Se.length }),
        /* @__PURE__ */ n("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Tagged Features" })
      ] }),
      /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged features" }),
      /* @__PURE__ */ n("div", { style: f.searchWrap, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
        /* @__PURE__ */ n(
          ht,
          {
            type: "text",
            placeholder: "Search features",
            value: be,
            onInput: (C) => ce(C.target.value),
            style: f.searchInput
          }
        ),
        be && /* @__PURE__ */ n(G, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => ce(""), children: "Clear" })
      ] }),
      de ? /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
        /* @__PURE__ */ n("span", { children: "Loading features…" })
      ] }) : Se.map((C) => {
        const ie = Ae === C.feature_id;
        return /* @__PURE__ */ n("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: C.name || "Unnamed" }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem", alignItems: "center" }, children: [
            /* @__PURE__ */ n(G, { variant: "iconSm", title: "Edit", onClick: () => g(C), disabled: ie, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:pencil" }) }),
            ie ? /* @__PURE__ */ n("span", { style: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", color: "#64748b" } }) }) : /* @__PURE__ */ n(G, { variant: "iconSm", title: "Delete", onClick: () => V(C.feature_id), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, C.feature_id);
      }),
      /* @__PURE__ */ n(G, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: () => g(), children: "Tag Feature" })
    ] }) : de ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
      /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.75rem" } }),
      /* @__PURE__ */ n("span", { children: "Loading features…" })
    ] }) : /* @__PURE__ */ n(ee, { children: [
      /* @__PURE__ */ n("div", { style: f.sectionLabel, children: "FEATURES OVERVIEW" }),
      /* @__PURE__ */ n("div", { style: { ...f.card, marginBottom: "0.75rem" }, children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ n("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ n("span", { style: { ...f.badge, background: "#14b8a6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: "0" }),
          /* @__PURE__ */ n("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Suggested Features" }),
            /* @__PURE__ */ n("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of untagged elements on this page" })
          ] })
        ] }),
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ n("div", { style: { ...f.card, marginBottom: "0.75rem", cursor: "pointer" }, onClick: xe, children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ n("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ n("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: Ye }),
          /* @__PURE__ */ n("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Tagged Features" }),
            /* @__PURE__ */ n("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of tagged Features on this page" })
          ] })
        ] }),
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ n("div", { style: f.heatmapRow, children: [
        /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Heatmap" }),
        /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ n(
            "button",
            {
              role: "switch",
              tabIndex: 0,
              style: f.toggle(_),
              onClick: te,
              onKeyDown: (C) => C.key === "Enter" && te(),
              children: /* @__PURE__ */ n("span", { style: f.toggleThumb(_) })
            }
          ),
          /* @__PURE__ */ n(G, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ n(
          G,
          {
            variant: E ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              v(!0), t({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Re-Select"
          }
        ),
        /* @__PURE__ */ n(
          G,
          {
            variant: "secondary",
            style: E ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              v(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Hide Selector"
          }
        )
      ] })
    ] }) }) })
  ] });
}
const Cs = new ro({
  defaultOptions: { mutations: { retry: 0 } }
});
class Es {
  iframe = null;
  dragHandle = null;
  gripButton = null;
  messageCallback = null;
  isReady = !1;
  mode = null;
  guideId = null;
  templateId = null;
  elementSelectedState = null;
  tagPageSavedAckCounter = 0;
  isFullscreen = !1;
  previewWasFullscreen = !1;
  savedIframeStyles = null;
  isDragging = !1;
  dragStartX = 0;
  dragStartY = 0;
  dragThreshold = 3;
  // Reduced threshold for more responsive dragging
  mouseDownX = 0;
  mouseDownY = 0;
  isMouseDown = !1;
  /**
   * Create and show editor iframe
   */
  create(e, i, r) {
    if (console.log("[Visual Designer] EditorFrame.create() called with mode:", i), this.iframe) {
      console.warn("[Visual Designer] EditorFrame already created, skipping");
      return;
    }
    this.mode = i || null, this.guideId = r?.guideId ?? null, this.templateId = r?.templateId ?? null, this.messageCallback = e, console.log("[Visual Designer] Creating editor iframe with mode:", this.mode), this.iframe = document.createElement("iframe"), this.iframe.id = "designer-editor-frame", this.iframe.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 600px;
      height: 800px;
      max-height: 90vh;
      border: none;
      border-radius: 16px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
      z-index: ${y.zIndex.editor};
      display: none;
      overflow: hidden;
    `, this.createDragHandle(), this.loadEditorHtml(), window.addEventListener("message", this.handleMessage);
    const o = () => {
      document.body ? (document.body.appendChild(this.iframe), this.dragHandle && document.body.appendChild(this.dragHandle), this.iframe && (this.iframe.onload = () => {
        this.isReady = !0, this.renderEditorContent(), this.updateDragHandlePosition();
      })) : document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", o) : setTimeout(o, 100);
    };
    o();
  }
  /**
   * Show editor frame
   */
  show() {
    console.log("[Visual Designer] EditorFrame.show() called"), this.iframe ? (console.log("[Visual Designer] Showing iframe"), this.iframe.style.display = "block", this.updateDragHandlePosition()) : console.warn("[Visual Designer] Cannot show iframe - iframe is null"), this.dragHandle ? (console.log("[Visual Designer] Showing drag handle"), this.dragHandle.style.display = "block") : console.warn("[Visual Designer] Cannot show drag handle - dragHandle is null");
  }
  /**
   * Hide editor frame
   */
  hide() {
    this.iframe && (this.iframe.style.display = "none"), this.dragHandle && (this.dragHandle.style.display = "none");
  }
  /**
   * Send element selected to editor (updates Preact component props)
   */
  sendElementSelected(e) {
    this.elementSelectedState = { selector: e.selector, elementInfo: e.elementInfo, xpath: e.xpath }, this.renderEditorContent(), this.show();
  }
  /**
   * Notify editor that selection was cleared (selector deactivated)
   */
  sendClearSelectionAck() {
    this.elementSelectedState = null, this.renderEditorContent();
  }
  sendTagPageSavedAck() {
    this.tagPageSavedAckCounter += 1, this.renderEditorContent();
  }
  expandToFullscreen() {
    !this.iframe || this.isFullscreen || (this.savedIframeStyles = {
      top: this.iframe.style.top,
      left: this.iframe.style.left,
      width: this.iframe.style.width,
      height: this.iframe.style.height,
      maxHeight: this.iframe.style.maxHeight,
      borderRadius: this.iframe.style.borderRadius
    }, this.iframe.style.top = "0", this.iframe.style.left = "0", this.iframe.style.width = "100vw", this.iframe.style.height = "100vh", this.iframe.style.maxHeight = "100vh", this.iframe.style.borderRadius = "0", this.dragHandle && (this.dragHandle.style.display = "none"), this.isFullscreen = !0);
  }
  showAndExpandToFullscreen() {
    this.show(), this.expandToFullscreen();
  }
  restoreAfterPreview() {
    this.show(), this.previewWasFullscreen && this.expandToFullscreen(), this.previewWasFullscreen = !1;
  }
  collapseFromFullscreen() {
    if (!this.iframe || !this.isFullscreen || !this.savedIframeStyles) return;
    const e = this.savedIframeStyles;
    this.iframe.style.top = e.top, this.iframe.style.left = e.left, this.iframe.style.width = e.width, this.iframe.style.height = e.height, this.iframe.style.maxHeight = e.maxHeight, this.iframe.style.borderRadius = e.borderRadius, this.dragHandle && (this.dragHandle.style.display = "block"), this.isFullscreen = !1, this.savedIframeStyles = null;
  }
  /**
   * Destroy editor frame
   */
  destroy() {
    window.removeEventListener("message", this.handleMessage), document.removeEventListener("mousemove", this.handleMouseMove, !0), document.removeEventListener("mouseup", this.handleMouseUp, !0), window.removeEventListener("mousemove", this.handleMouseMove, !0), window.removeEventListener("mouseup", this.handleMouseUp, !0), this.iframe && (this.iframe.remove(), this.iframe = null), this.dragHandle && (this.dragHandle.remove(), this.dragHandle = null), this.gripButton = null, this.isReady = !1, this.messageCallback = null, this.isDragging = !1, this.isMouseDown = !1, document.body.style.cursor = "", document.documentElement.style.cursor = "", document.body.style.userSelect = "", document.documentElement.style.userSelect = "";
  }
  /**
   * Send message to iframe
   */
  sendMessage(e) {
    if (!this.iframe || !this.isReady) {
      setTimeout(() => this.sendMessage(e), 100);
      return;
    }
    const i = this.iframe.contentWindow;
    i && i.postMessage(e, "*");
  }
  /**
   * Load editor HTML content (minimal shell - Preact renders the UI)
   */
  loadEditorHtml() {
    const e = this.getMinimalEditorHtml(), i = new Blob([e], { type: "text/html" }), r = URL.createObjectURL(i);
    this.iframe && (this.iframe.src = r);
  }
  /**
   * Render Preact editor component into iframe
   */
  renderEditorContent() {
    if (!this.iframe || !this.isReady) return;
    const e = this.iframe.contentDocument, i = e?.getElementById("designer-editor-root");
    if (!e || !i) return;
    const r = (s) => {
      if (s.type === "EXPAND_TO_FULLSCREEN") {
        this.expandToFullscreen();
        return;
      }
      if (s.type === "COLLAPSE_FROM_FULLSCREEN") {
        this.collapseFromFullscreen();
        return;
      }
      if (s.type === "PREVIEW_CONTENT") {
        this.previewWasFullscreen = this.isFullscreen, this.collapseFromFullscreen(), this.hide(), this.messageCallback?.(s);
        return;
      }
      if (s.type === "CLOSE_PREVIEW") {
        this.restoreAfterPreview(), this.messageCallback?.(s);
        return;
      }
      this.messageCallback?.(s);
    }, o = this.mode === "tag-page" ? /* @__PURE__ */ n(us, { onMessage: r }) : this.mode === "tag-feature" ? /* @__PURE__ */ n(
      ws,
      {
        onMessage: r,
        elementSelected: this.elementSelectedState
      }
    ) : /* @__PURE__ */ n(
      Qo,
      {
        onMessage: r,
        elementSelected: this.elementSelectedState,
        guideId: this.guideId,
        templateId: this.templateId
      }
    );
    Qe(
      /* @__PURE__ */ n(_o, { client: Cs, children: o }),
      i
    );
  }
  /**
   * Minimal HTML shell - Preact components provide the UI
   */
  getMinimalEditorHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Designer Editor</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"><\/script>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Montserrat',-apple-system,BlinkMacSystemFont,sans-serif;padding:20px;color:#0f172a;line-height:1.6;height:100%;overflow-y:auto;-webkit-font-smoothing:antialiased}</style>
  <style>${Oo}</style>
</head>
<body>
  <div id="designer-editor-root"></div>
</body>
</html>`;
  }
  /**
   * Create drag handle overlay
   */
  createDragHandle() {
    if (this.dragHandle)
      return;
    this.dragHandle = document.createElement("div"), this.dragHandle.id = "designer-editor-drag-handle", this.dragHandle.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 400px;
      height: 70px;
      background: transparent;
      cursor: default;
      z-index: ${y.zIndex.controls};
      display: none;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    `;
    const e = document.createElement("div");
    e.style.cssText = `
      position: absolute;
      top: 30%;
      left: 50%;
      transform: translate(-50%, -50%);
      cursor: grab;
      pointer-events: auto;
      padding: 6px 8px;
      border-radius: 6px;
      background: transparent;
      border: none;
      z-index: 1;
      transition: background 0.2s, border-color 0.2s;
    `, e.onmouseenter = () => {
      e.style.background = "transparent", e.style.border = "none";
    }, e.onmouseleave = () => {
      e.style.background = "transparent", e.style.border = "none";
    };
    const i = document.createElement("iconify-icon");
    i.setAttribute("icon", "pepicons-print:dots-x"), i.style.cssText = "font-size: 18px; color: #64748b; pointer-events: none;", e.appendChild(i), this.dragHandle.appendChild(e), this.gripButton = e, e.addEventListener("mousedown", this.handleMouseDown, !0), document.addEventListener("mousemove", this.handleMouseMove, !0), document.addEventListener("mouseup", this.handleMouseUp, !0), window.addEventListener("mousemove", this.handleMouseMove, !0), window.addEventListener("mouseup", this.handleMouseUp, !0);
  }
  /**
   * Update drag handle position to match iframe
   */
  updateDragHandlePosition() {
    if (!this.iframe || !this.dragHandle)
      return;
    const e = this.iframe.getBoundingClientRect();
    this.dragHandle.style.top = `${e.top}px`, this.dragHandle.style.left = `${e.left}px`, this.dragHandle.style.width = `${e.width}px`;
  }
  /**
   * Handle mouse down on drag handle
   */
  handleMouseDown = (e) => {
    if (!this.iframe || !this.dragHandle)
      return;
    this.mouseDownX = e.clientX, this.mouseDownY = e.clientY, this.isMouseDown = !0, this.isDragging = !1;
    const i = this.iframe.getBoundingClientRect();
    this.dragStartX = e.clientX - i.left, this.dragStartY = e.clientY - i.top, e.preventDefault(), e.stopPropagation();
  };
  /**
   * Handle mouse move during drag
   */
  handleMouseMove = (e) => {
    if (!this.isMouseDown || !this.iframe || !this.dragHandle)
      return;
    if (!this.isDragging) {
      const d = Math.abs(e.clientX - this.mouseDownX), h = Math.abs(e.clientY - this.mouseDownY);
      if (Math.sqrt(d * d + h * h) > this.dragThreshold)
        this.isDragging = !0, document.body.style.cursor = "grabbing", document.documentElement.style.cursor = "grabbing", document.body.style.userSelect = "none", document.documentElement.style.userSelect = "none", this.iframe && (this.iframe.style.pointerEvents = "none"), this.gripButton && (this.gripButton.style.cursor = "grabbing");
      else
        return;
    }
    e.preventDefault(), e.stopPropagation();
    const i = e.clientX - this.dragStartX, r = e.clientY - this.dragStartY, o = window.innerWidth, s = window.innerHeight, l = this.iframe.offsetWidth, a = Math.max(-l + 50, Math.min(i, o - 50)), u = Math.max(0, Math.min(r, s - 100));
    this.iframe.style.left = `${a}px`, this.iframe.style.top = `${u}px`, this.iframe.style.right = "auto", this.iframe.style.bottom = "auto", this.dragHandle.style.left = `${a}px`, this.dragHandle.style.top = `${u}px`;
  };
  /**
   * Handle mouse up to end drag
   */
  handleMouseUp = (e) => {
    this.isMouseDown && (this.isDragging = !1, this.isMouseDown = !1, document.body.style.cursor = "", document.documentElement.style.cursor = "", document.body.style.userSelect = "", document.documentElement.style.userSelect = "", this.iframe && (this.iframe.style.pointerEvents = ""), this.gripButton && (this.gripButton.style.cursor = "grab"), e.preventDefault(), e.stopPropagation());
  };
  /**
   * Handle messages from iframe
   */
  handleMessage = (e) => {
    const i = e.data;
    !i || !i.type || (this.messageCallback && this.messageCallback(i), (i.type === "CANCEL" || i.type === "GUIDE_SAVED") && this.hide());
  };
}
const ks = "visual-designer-guides", _n = "1.0.0";
class Is {
  storageKey;
  constructor(e = ks) {
    this.storageKey = e;
  }
  getGuides() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const i = JSON.parse(e);
      return i.version !== _n ? (this.clear(), []) : i.guides || [];
    } catch {
      return [];
    }
  }
  getGuidesByPage(e) {
    return this.getGuides().filter((r) => r.page === e && r.status === "active");
  }
  saveGuide(e) {
    const i = this.getGuides(), r = i.findIndex((s) => s.id === e.id), o = {
      ...e,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: e.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    r >= 0 ? i[r] = o : i.push(o), this.saveGuides(i);
  }
  deleteGuide(e) {
    const i = this.getGuides().filter((r) => r.id !== e);
    this.saveGuides(i);
  }
  saveGuides(e) {
    const i = { guides: e, version: _n };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(e) {
    return this.getGuides().find((i) => i.id === e) || null;
  }
}
function Ts({ onExit: t }) {
  const e = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: y.bg,
    border: `2px solid ${y.primary}`,
    borderRadius: y.borderRadius,
    color: y.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: y.fontFamily,
    cursor: "pointer",
    zIndex: String(y.zIndex.controls),
    boxShadow: y.shadow,
    transition: "all 0.2s ease",
    pointerEvents: "auto"
  };
  return /* @__PURE__ */ n(
    "button",
    {
      id: "designer-exit-editor-btn",
      style: e,
      onClick: t,
      onMouseEnter: (i) => {
        i.currentTarget.style.background = y.primary, i.currentTarget.style.color = y.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = y.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = y.bg, i.currentTarget.style.color = y.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = y.shadow;
      },
      children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function Rs() {
  return /* @__PURE__ */ n(
    "div",
    {
      id: "designer-red-border-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: `5px solid ${y.primary}`,
        pointerEvents: "none",
        zIndex: y.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function Os() {
  return /* @__PURE__ */ n(
    "div",
    {
      id: "designer-studio-badge",
      style: {
        position: "fixed",
        top: "4px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "0px 10px 3px",
        background: y.primary,
        color: y.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: y.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${y.primary}`,
        borderTop: "none",
        zIndex: y.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function As() {
  return /* @__PURE__ */ n(
    "div",
    {
      id: "designer-loading-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(248, 250, 252, 0.97)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: y.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: y.fontFamily,
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ n(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2.5rem 3rem",
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)",
              minWidth: "220px"
            },
            children: [
              /* @__PURE__ */ n(
                "div",
                {
                  style: {
                    width: 56,
                    height: 56,
                    border: "3px solid #e2e8f0",
                    borderTopColor: y.primary,
                    borderRadius: "50%",
                    animation: "vd-spin 0.8s linear infinite",
                    marginBottom: "1.5rem"
                  }
                }
              ),
              /* @__PURE__ */ n(
                "div",
                {
                  style: {
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#1e293b",
                    letterSpacing: "-0.02em",
                    marginBottom: "0.25rem"
                  },
                  children: "Loading editor"
                }
              ),
              /* @__PURE__ */ n(
                "div",
                {
                  style: {
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    fontWeight: 500
                  },
                  children: [
                    /* @__PURE__ */ n("span", { style: { animation: "vd-dot1 1.4s ease-in-out infinite" }, children: "." }),
                    /* @__PURE__ */ n("span", { style: { animation: "vd-dot2 1.4s ease-in-out infinite" }, children: "." }),
                    /* @__PURE__ */ n("span", { style: { animation: "vd-dot3 1.4s ease-in-out infinite" }, children: "." })
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ n("style", { children: `
        @keyframes vd-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes vd-dot1 {
          0%, 20% { opacity: 0.2; }
          40%, 100% { opacity: 1; }
        }
        @keyframes vd-dot2 {
          0%, 20%, 40% { opacity: 0.2; }
          60%, 100% { opacity: 1; }
        }
        @keyframes vd-dot3 {
          0%, 20%, 40%, 60% { opacity: 0.2; }
          80%, 100% { opacity: 1; }
        }
      ` })
      ]
    }
  );
}
function Ps(t) {
  return /* @__PURE__ */ n(ee, { children: [
    t.showExitButton && /* @__PURE__ */ n(Ts, { onExit: t.onExitEditor }),
    t.showRedBorder && /* @__PURE__ */ n(Rs, {}),
    t.showBadge && /* @__PURE__ */ n(Os, {}),
    t.showLoading && /* @__PURE__ */ n(As, {})
  ] });
}
function Fs(t, e) {
  Qe(/* @__PURE__ */ n(Ps, { ...e }), t);
}
class er {
  config;
  storage;
  editorMode;
  guideRenderer;
  featureHeatmapRenderer;
  editorFrame;
  heatmapEnabled = !1;
  isInitialized = !1;
  isEditorMode = !1;
  sdkRoot = null;
  showLoading = !1;
  loadingFallbackTimer = null;
  /** Features for heatmap from API (editor sends via FEATURES_FOR_HEATMAP; xpaths from feature rules) */
  featuresForHeatmap = [];
  /** guide_id from URL or config (in-memory only) */
  guideId = null;
  /** template_id from URL or config (in-memory only) */
  templateId = null;
  /** Guides fetched from API for the current page */
  fetchedGuides = [];
  /** Current URL to detect page changes */
  currentUrl = typeof window < "u" ? window.location.href : "";
  styleInjected = !1;
  previewBackButton = null;
  constructor(e = {}) {
    this.config = e, this.guideId = e.guideId ?? null, this.templateId = e.templateId ?? null, this.storage = new Is(e.storageKey), this.editorMode = new dr(), this.guideRenderer = new Pr(), this.featureHeatmapRenderer = new Lr(), this.editorFrame = new Es();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((i, r) => {
      const o = {
        guide_id: i.guide_id,
        step_index: r
      }, a = [...(i.templates || []).filter((u) => u.is_active)].sort((u, d) => u.step_order - d.step_order)[r];
      return a && (o.template_id = a.template_id, o.template_key = a.template?.template_key, o.step_order = a.step_order, o.xpath = a.x_path), this.config.onGuideDismissed?.(i.guide_id), this.trackEvent("dismissed", o);
    }), this.guideRenderer.setOnPollResponse((i, r, o, s, l, a, u) => {
      this.trackEvent("poll_responses", {
        guide_id: i.guide_id,
        template_id: r,
        block_id: o,
        step_index: u,
        survey_question: l,
        survey_response: a,
        survey_type: s
      });
    }), this.guideRenderer.setOnNext((i, r, o) => {
      const a = [...(i.templates || []).filter((u) => u.is_active)].sort((u, d) => u.step_order - d.step_order)[r];
      if (a) {
        const u = r === o - 1;
        let d = "middle";
        r === 0 ? d = "first" : u && (d = "last");
        const h = {
          guide_id: i.guide_id,
          template_id: a.template_id,
          map_id: a.map_id,
          step_order: a.step_order,
          template_key: a.template?.template_key,
          guide_step: d,
          xpath: a.x_path
        };
        return u && this.trackEvent("completed", h), this.trackEvent("viewed", h);
      }
    }), this.shouldEnableEditorMode() ? (this.showLoading = !0, this.renderOverlays(), this.enableEditor()) : this.loadGuides(), this.heatmapEnabled = localStorage.getItem("designerHeatmapEnabled") === "true", this.renderFeatureHeatmap(), this.setupEventListeners(), this.fetchGuides(), this.injectGlobalProtectionStyles();
  }
  enableEditor() {
    if (this.isEditorMode) return;
    this.isEditorMode = !0;
    let e = typeof window < "u" && window.__visualDesignerMode || null;
    e || (e = localStorage.getItem("designerModeType") || null), this.editorFrame.create((r) => this.handleEditorMessage(r), e, {
      guideId: this.guideId,
      templateId: this.templateId
    });
    const i = e === "tag-page" || e === "tag-feature";
    this.ensureSDKRoot(), this.renderOverlays(), localStorage.setItem("designerMode", "true"), e && localStorage.setItem("designerModeType", e), setTimeout(() => {
      this.editorFrame.show(), this.renderOverlays();
    }, i ? 100 : 300), this.loadingFallbackTimer = setTimeout(() => {
      this.loadingFallbackTimer = null, this.showLoading && (this.showLoading = !1, this.renderOverlays());
    }, 5e3);
  }
  disableEditor() {
    if (this.isEditorMode) {
      try {
        window.close();
      } catch {
      }
      this.isEditorMode = !1, this.editorMode.deactivate(), this.editorFrame.destroy(), this.featureHeatmapRenderer.destroy(), this.loadingFallbackTimer && (clearTimeout(this.loadingFallbackTimer), this.loadingFallbackTimer = null), this.showLoading = !1, localStorage.removeItem("designerMode"), localStorage.removeItem("designerModeType"), this.renderOverlays(), this.loadGuides();
    }
  }
  getGuides() {
    return this.storage.getGuides();
  }
  getGuidesForCurrentPage() {
    return this.storage.getGuidesByPage(je());
  }
  saveGuide(e) {
    const i = {
      ...e,
      id: Ai(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.storage.saveGuide(i), this.isEditorMode || this.loadGuides(), this.config.onGuideSaved?.(i), i;
  }
  deleteGuide(e) {
    this.storage.deleteGuide(e), this.guideRenderer.dismissGuide(e);
  }
  loadGuides() {
    this.guideRenderer.renderGuides(this.storage.getGuides());
  }
  isEditorModeActive() {
    return this.isEditorMode;
  }
  getGuideId() {
    return this.guideId;
  }
  getTemplateId() {
    return this.templateId;
  }
  async fetchGuides() {
    try {
      const e = je(), i = this._getStorageItem("__rg_visitor_id"), r = new URLSearchParams({ target_page: e });
      i && r.set("visitor_id", i);
      const o = await Oe.get(`/guides?${r.toString()}`);
      if (o) {
        console.log("[Visual Designer] Response:", o);
        const s = (o.core_features || []).flatMap((l) => l.rules.filter((a) => a.selector_type === "xpath" && a.is_active).map((a) => a.selector_value));
        sessionStorage.setItem("__rg_core_context", JSON.stringify({
          page_path: e,
          is_core_page: (o.core_pages || []).length > 0,
          core_feature_xpaths: s
        }));
      }
      if (o && o.data) {
        this.fetchedGuides = Array.isArray(o.data) ? o.data : [o.data], console.log("[Visual Designer] Fetched guides for page:", e, this.fetchedGuides);
        for (const s of this.fetchedGuides)
          if (s.is_auto === !0 || s.target_segment === null || s.target_segment === "None") {
            console.log("[Visual Designer] Auto-triggering guide:", s.guide_name), this.guideRenderer.renderTriggeredGuide(s);
            break;
          }
      }
    } catch (e) {
      console.error("[Visual Designer] Error fetching guides:", e);
    }
  }
  _getStorageItem(e) {
    if (typeof window > "u") return null;
    try {
      const i = localStorage.getItem(e);
      if (i == null) return null;
      try {
        return JSON.parse(i);
      } catch {
        return i;
      }
    } catch {
      return null;
    }
  }
  _getIdentity() {
    return {
      visitor_id: this._getStorageItem("__rg_visitor_id"),
      account_id: this._getStorageItem("__rg_account_id"),
      session_id: this._getStorageItem("__rg_session_id")
    };
  }
  _getDeviceContext() {
    if (typeof window > "u") return {};
    const e = navigator.userAgent;
    let i = "Unknown", r = "Unknown";
    e.indexOf("Chrome") > -1 && e.indexOf("Edg") === -1 ? (i = "Chrome", r = e.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown") : e.indexOf("Safari") > -1 && e.indexOf("Chrome") === -1 ? (i = "Safari", r = e.match(/Version\/([\d.]+)/)?.[1] || "Unknown") : e.indexOf("Firefox") > -1 ? (i = "Firefox", r = e.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown") : e.indexOf("Edg") > -1 && (i = "Edge", r = e.match(/Edg\/([\d.]+)/)?.[1] || "Unknown");
    let o = "Unknown", s = "Unknown";
    return e.indexOf("Win") > -1 ? (o = "Windows", e.indexOf("Windows NT 10.0") > -1 && (s = "10")) : e.indexOf("Mac") > -1 ? (o = "macOS", s = e.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : e.indexOf("Linux") > -1 ? o = "Linux" : e.indexOf("Android") > -1 ? (o = "Android", s = e.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (e.indexOf("iOS") > -1 || e.indexOf("iPhone") > -1 || e.indexOf("iPad") > -1) && (o = "iOS", s = e.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), {
      device_type: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(e) ? "mobile" : "desktop",
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      browser_name: i,
      browser_version: r,
      os_name: o,
      os_version: s,
      user_agent: e,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown"
    };
  }
  _getPageContext() {
    return typeof window > "u" ? {} : {
      page_url: window.location.href,
      page_title: document.title,
      page_path: window.location.pathname,
      page_hash: window.location.hash || null,
      page_query: window.location.search || null
    };
  }
  async trackEvent(e, i = {}) {
    await this.trackEventBatch([{ eventName: e, properties: i }]);
  }
  async trackEventBatch(e) {
    try {
      const i = (/* @__PURE__ */ new Date()).toISOString(), r = this._getIdentity(), o = this._getPageContext();
      let s = 0;
      const l = this._getStorageItem("__rg_session_start");
      if (l) {
        const h = new Date(l).getTime();
        isNaN(h) || (s = Date.now() - h);
      }
      const u = (this._getStorageItem("__rg_visitor_traits") || {}).email || null, d = e.map((h) => {
        const c = h.properties || {};
        return {
          event_id: "evt_" + Ai(),
          event_type: "guide",
          event_name: h.eventName,
          timestamp: i,
          ingested_at: i,
          // Simulating server-side ingestion time
          visitor_id: r.visitor_id,
          account_id: r.account_id,
          session_id: r.session_id,
          page_url: o.page_url,
          visitor_email: u,
          session_duration_ms: s,
          element_id: c.element_id || c.xpath || null,
          guide_id: c.guide_id || null,
          properties: c
        };
      });
      console.log("[Visual Designer] Tracking Batch:", d), await Oe.post("/guide-events", {
        events: d
      }, { keepalive: !0 });
    } catch (i) {
      console.error("[Visual Designer] Failed to track events:", i);
    }
  }
  handlePageChange() {
    const e = window.location.href;
    e !== this.currentUrl && (this.currentUrl = e, this.fetchGuides());
  }
  handleGlobalClick(e) {
    if (this.isEditorMode) return;
    const i = e.target;
    if (!i) return;
    const r = Ne.getXPath(i);
    for (const o of this.fetchedGuides)
      o.target_segment && o.target_segment !== "None" && o.target_segment === r && (this.trackEvent("triggered", {
        guide_id: o.guide_id,
        guide_name: o.guide_name,
        xpath: r
      }), this.guideRenderer.renderTriggeredGuide(o));
  }
  shouldEnableEditorMode() {
    return this.config.editorMode !== void 0 ? this.config.editorMode : typeof window < "u" && window.__visualDesignerWasLaunched ? !0 : localStorage.getItem("designerMode") === "true";
  }
  handleEditorMessage(e) {
    switch (e.type) {
      case "ELEMENT_SELECTED":
        this.handleElementSelected(e);
        break;
      case "SAVE_GUIDE":
        this.handleSaveGuide(e);
        break;
      case "TAG_FEATURE_CLICKED":
        this.editorMode.activate((i) => this.handleEditorMessage(i));
        break;
      case "ACTIVATE_SELECTOR":
        this.editorMode.activate((i) => this.handleEditorMessage(i));
        break;
      case "CLEAR_SELECTION_CLICKED":
        this.editorMode.deactivate(), this.editorFrame.sendClearSelectionAck();
        break;
      case "HEATMAP_TOGGLE":
        this.handleHeatmapToggle(e.enabled);
        break;
      case "FEATURES_FOR_HEATMAP":
        this.handleFeaturesForHeatmap(e.features);
        break;
      case "PREVIEW_CONTENT":
        this.handlePreviewContent(e);
        break;
      case "CLOSE_PREVIEW":
        this.closePreview();
        break;
      case "CANCEL":
        this.editorFrame.hide();
        break;
      case "EXIT_EDITOR_MODE":
        this.disableEditor();
        break;
      case "EDITOR_READY":
        this.loadingFallbackTimer && (clearTimeout(this.loadingFallbackTimer), this.loadingFallbackTimer = null), this.showLoading = !1, this.renderOverlays();
        break;
    }
  }
  handleElementSelected(e) {
    this.editorFrame.sendElementSelected(e);
  }
  handleSaveGuide(e) {
    this.saveGuide({
      ...e.guide,
      page: je()
    });
  }
  handleHeatmapToggle(e) {
    this.heatmapEnabled = e;
    try {
      localStorage.setItem("designerHeatmapEnabled", String(e));
    } catch {
    }
    this.renderFeatureHeatmap();
  }
  handleFeaturesForHeatmap(e) {
    this.featuresForHeatmap = e.map((i) => {
      let o = (i.rules?.find(
        (s) => s.selector_type === "xpath" && (s.selector_value ?? "").trim() !== ""
      )?.selector_value ?? "").trim();
      return o && o.startsWith("/body") && (o = "/html[1]" + o), {
        id: i.feature_id,
        featureName: i.name,
        selector: o,
        url: ""
      };
    }), this.renderFeatureHeatmap();
  }
  handlePreviewContent(e) {
    const i = {
      guide_id: "__preview__",
      guide_name: "Preview",
      description: null,
      target_segment: null,
      guide_category: null,
      target_page: null,
      type: e.guideType || (e.layoutMode === "anchored" ? "tooltip" : "modal"),
      trigger_type: null,
      status: "active",
      priority: 0,
      created_at: "",
      updated_at: "",
      updated_by: null,
      templates: [
        {
          map_id: "__preview_map__",
          template_id: "__preview_template__",
          template: {
            template_id: "__preview_template__",
            title: "Preview",
            subtitle: "",
            content: e.content,
            template_key: "__preview__"
          },
          content: e.content,
          step_order: 1,
          url: null,
          x_path: e.xpath,
          is_active: !0,
          auto_click_target: !1
        }
      ],
      steps: []
    };
    if (e.layoutMode === "floating")
      try {
        const r = JSON.parse(e.content || "{}");
        r.layout || (r.layout = {}), r.layout.position = e.position, i.templates[0].content = JSON.stringify(r), i.templates[0].template && (i.templates[0].template.content = JSON.stringify(r));
      } catch {
      }
    this.guideRenderer.renderTriggeredGuide(i), this.showPreviewBackButton();
  }
  showPreviewBackButton() {
    if (this.previewBackButton) return;
    const e = document.createElement("button");
    e.id = "designer-preview-back-btn", e.textContent = "← Back to Editor", e.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: ${y.zIndex.controls};
      padding: 0.625rem 1.5rem;
      background: #1855BC;
      color: #fff;
      border: none;
      border-radius: 9999px;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(24,85,188,0.35);
    `, e.onclick = () => this.closePreview(), document.body.appendChild(e), this.previewBackButton = e;
  }
  closePreview() {
    this.guideRenderer.clearTriggeredGuide(), this.previewBackButton && (this.previewBackButton.remove(), this.previewBackButton = null), this.editorFrame.restoreAfterPreview();
  }
  getTaggedFeatures() {
    return this.featuresForHeatmap;
  }
  renderFeatureHeatmap() {
    this.featureHeatmapRenderer.render(this.getTaggedFeatures(), this.heatmapEnabled);
  }
  setupEventListeners() {
    let e, i;
    const r = () => {
      this.guideRenderer.updatePositions(this.storage.getGuides());
    }, o = () => {
      this.featureHeatmapRenderer.updatePositions(this.getTaggedFeatures());
    };
    window.addEventListener("resize", () => {
      clearTimeout(e), e = window.setTimeout(() => {
        r(), o();
      }, 100);
    }), window.addEventListener(
      "scroll",
      () => {
        clearTimeout(i), i = window.setTimeout(() => {
          r(), o();
        }, 50);
      },
      !0
    ), window.addEventListener("popstate", () => this.handlePageChange());
    const s = history.pushState;
    s && (history.pushState = (...a) => {
      s.apply(history, a), this.handlePageChange();
    });
    const l = history.replaceState;
    l && (history.replaceState = (...a) => {
      l.apply(history, a), this.handlePageChange();
    }), document.addEventListener("click", (a) => this.handleGlobalClick(a), !0);
  }
  ensureSDKRoot() {
    if (!this.sdkRoot) {
      if (!document.body) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => this.ensureSDKRoot());
          return;
        }
        setTimeout(() => this.ensureSDKRoot(), 100);
        return;
      }
      this.sdkRoot = document.createElement("div"), this.sdkRoot.id = "designer-sdk-root", document.body.appendChild(this.sdkRoot);
    }
  }
  injectGlobalProtectionStyles() {
    if (this.styleInjected || typeof document > "u") return;
    const e = document.createElement("style");
    e.id = "designer-protection-styles", e.textContent = `
    #designer-editor-frame {
      pointer-events: auto !important;
      position: fixed !important;
      z-index: 2147483647 !important;
    }

    #designer-editor-drag-handle {
      pointer-events: auto !important;
      position: fixed !important;
      z-index: 2147483647 !important;
    }
  `, document.head.appendChild(e), this.styleInjected = !0;
  }
  renderOverlays() {
    this.ensureSDKRoot(), this.sdkRoot && Fs(this.sdkRoot, {
      showExitButton: this.isEditorMode,
      showRedBorder: this.isEditorMode,
      showBadge: this.isEditorMode,
      showLoading: this.showLoading,
      onExitEditor: () => this.disableEditor()
    });
  }
  injectMontserratFont() {
    if (typeof document > "u" || !document.head || document.getElementById("designer-montserrat-font")) return;
    const e = document.createElement("link");
    e.id = "designer-montserrat-font", e.rel = "stylesheet", e.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap", document.head.appendChild(e);
  }
  injectIconifyScript() {
    if (typeof document > "u" || !document.head || document.getElementById("designer-iconify-script")) return;
    const e = document.createElement("script");
    e.id = "designer-iconify-script", e.src = "https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js", e.async = !0, document.head.appendChild(e);
  }
}
const Ii = "1.0.0", tr = "rg-web-sdk", Ls = "web", zs = 1, J = {
  VISITOR_ID: "__rg_visitor_id",
  ACCOUNT_ID: "__rg_account_id",
  SESSION_ID: "__rg_session_id",
  SESSION_START: "__rg_session_start",
  SESSION_LAST_ACTIVITY: "__rg_session_last_activity",
  EVENT_QUEUE: "__rg_event_queue",
  OPT_OUT: "__rg_opt_out",
  VISITOR_TRAITS: "__rg_visitor_traits",
  ACCOUNT_TRAITS: "__rg_account_traits"
}, Ds = {
  apiHost: "https://api.rg.io",
  autoCapture: !0,
  autoPageViews: !0,
  persistence: "localStorage",
  // 'localStorage' | 'cookie' | 'memory'
  sessionTimeout: 30,
  // minutes
  batchSize: 50,
  // events
  batchInterval: 10,
  // seconds
  privacyConfig: {
    maskInputs: !0,
    maskTextContent: !1,
    sensitiveSelectors: [
      'input[type="password"]',
      'input[name*="password"]',
      'input[id*="password"]',
      'input[name*="card"]',
      'input[name*="cvv"]',
      'input[name*="cvc"]',
      'input[autocomplete="cc-number"]',
      'input[autocomplete="cc-exp"]',
      'input[autocomplete="cc-csc"]',
      'input[name*="ssn"]',
      'input[name*="tax"]',
      "[data-rg-ignore]",
      "[data-private]",
      ".rg-ignore"
    ]
  },
  doNotProcess: [],
  requireConsent: !1
}, Je = {
  PAGE_VIEW: "page_view",
  CLICK: "click",
  INPUT: "input",
  SCROLL: "scroll",
  ERROR: "error"
}, Ze = {
  NAVIGATION: "navigation",
  ENGAGEMENT: "engagement",
  DIAGNOSTIC: "diagnostic"
}, pt = {
  NORMAL: "normal",
  RAGE_CLICK: "rage_click",
  ERROR_CLICK: "error_click",
  U_TURN: "u_turn"
}, ct = {
  rageClickThreshold: 3,
  rageClickWindow: 1e3,
  deadClickDelay: 300,
  errorClickWindow: 2e3,
  uturnThreshold: 5e3
}, Jt = [1e3, 2e3, 5e3, 1e4, 3e4], bn = 5, Ns = 1e3, Ms = 100, Us = {
  click: { limit: 100, window: 1e3 },
  scroll: { limit: 10, window: 1e3 },
  input: { limit: 50, window: 1e3 }
}, Zt = {
  pageView: 100,
  scroll: 500
}, dt = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
};
function ft() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (t) => {
    const e = Math.random() * 16 | 0;
    return (t === "x" ? e : e & 3 | 8).toString(16);
  });
}
function mt() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function Bs() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function Ws() {
  const t = navigator.userAgent;
  return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(t) ? "tablet" : /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silfae|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(t) ? "mobile" : "desktop";
}
function Gs() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Chrome") > -1 && t.indexOf("Edg") === -1 ? (e = "Chrome", i = t.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Safari") > -1 && t.indexOf("Chrome") === -1 ? (e = "Safari", i = t.match(/Version\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Firefox") > -1 ? (e = "Firefox", i = t.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Edg") > -1 ? (e = "Edge", i = t.match(/Edg\/([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("MSIE") > -1 || t.indexOf("Trident") > -1) && (e = "Internet Explorer", i = t.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || "Unknown"), { browserName: e, browserVersion: i };
}
function $s() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Win") > -1 ? (e = "Windows", t.indexOf("Windows NT 10.0") > -1 ? i = "10" : t.indexOf("Windows NT 6.3") > -1 ? i = "8.1" : t.indexOf("Windows NT 6.2") > -1 ? i = "8" : t.indexOf("Windows NT 6.1") > -1 && (i = "7")) : t.indexOf("Mac") > -1 ? (e = "macOS", i = t.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : t.indexOf("Linux") > -1 ? e = "Linux" : t.indexOf("Android") > -1 ? (e = "Android", i = t.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("iOS") > -1 || t.indexOf("iPhone") > -1 || t.indexOf("iPad") > -1) && (e = "iOS", i = t.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), { osName: e, osVersion: i };
}
function Hs() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Unknown";
  }
}
function qs(t) {
  try {
    const e = new URL(t), i = {};
    return e.searchParams.forEach((r, o) => {
      i[o] = r;
    }), i;
  } catch {
    return {};
  }
}
function pi(t, e = 200) {
  return t ? t.length > e ? t.substring(0, e) : t : null;
}
function fi(t, ...e) {
  return Object.assign({}, t, ...e);
}
function vn(t, e) {
  let i;
  return function(...o) {
    const s = () => {
      clearTimeout(i), t(...o);
    };
    clearTimeout(i), i = setTimeout(s, e);
  };
}
function Vs(t, e = null) {
  try {
    return JSON.parse(t);
  } catch {
    return e;
  }
}
function ei(t, e = null) {
  try {
    return JSON.stringify(t);
  } catch {
    return e;
  }
}
function A(t, ...e) {
  typeof console < "u" && console[t] && console[t]("[RG SDK]", ...e);
}
function js(t) {
  if (!t) return null;
  if (t.id)
    return `//*[@id="${t.id}"]`;
  const e = [];
  let i = t;
  for (; i && i.nodeType === Node.ELEMENT_NODE; ) {
    let r = 1, o = i.previousSibling;
    for (; o; )
      o.nodeType === Node.ELEMENT_NODE && o.tagName === i.tagName && r++, o = o.previousSibling;
    const s = i.tagName.toLowerCase();
    e.unshift(`${s}[${r}]`), i = i.parentNode;
  }
  return e.length > 0 ? "/" + e.join("/") : null;
}
function Qs(t) {
  if (!t) return null;
  if (t.id)
    return `#${CSS.escape(t.id)}`;
  const e = [];
  let i = t;
  for (; i && i.nodeType === Node.ELEMENT_NODE; ) {
    let r = i.tagName.toLowerCase();
    if (i.className && typeof i.className == "string") {
      const o = i.className.split(/\s+/).filter((s) => s && !/^[0-9]/.test(s)).map((s) => "." + CSS.escape(s)).join("");
      r += o;
    }
    e.unshift(r);
    try {
      if (document.querySelectorAll(e.join(" > ")).length === 1)
        break;
    } catch {
    }
    if (i = i.parentElement, e.length > 10) break;
  }
  return e.join(" > ") || null;
}
function Ks(t) {
  if (!t) return null;
  const e = t.getAttribute("aria-label") || t.getAttribute("alt") || t.getAttribute("title") || (t.tagName === "INPUT" ? t.value : null) || t.textContent?.trim() || null;
  return pi(e, 200);
}
function Ys(t) {
  if (!t) return !1;
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0";
}
class Xs {
  constructor(e = "localStorage") {
    this.preferredStorage = e, this.storageType = this._detectAvailableStorage(), this.memoryStorage = {};
  }
  _detectAvailableStorage() {
    return this.preferredStorage === "localStorage" && this._testStorage(window.localStorage) ? "localStorage" : this._testStorage(window.sessionStorage) ? "sessionStorage" : (A("warn", "No persistent storage available, using in-memory storage"), "memory");
  }
  _testStorage(e) {
    try {
      const i = "__rg_storage_test__";
      return e.setItem(i, "test"), e.removeItem(i), !0;
    } catch {
      return !1;
    }
  }
  _getStorage() {
    return this.storageType === "localStorage" ? window.localStorage : this.storageType === "sessionStorage" ? window.sessionStorage : null;
  }
  setItem(e, i) {
    try {
      const r = this._getStorage(), o = ei(i);
      return o ? (r ? r.setItem(e, o) : this.memoryStorage[e] = o, !0) : (A("warn", "Failed to serialize value for key:", e), !1);
    } catch (r) {
      if (r.name === "QuotaExceededError") {
        A("warn", "Storage quota exceeded, attempting cleanup"), this._cleanup();
        try {
          const o = this._getStorage();
          return o ? o.setItem(e, ei(i)) : this.memoryStorage[e] = ei(i), !0;
        } catch (o) {
          return A("error", "Failed to set item after cleanup:", e, o), !1;
        }
      }
      return A("error", "Failed to set item:", e, r), !1;
    }
  }
  getItem(e) {
    try {
      const i = this._getStorage();
      let r;
      return i ? r = i.getItem(e) : r = this.memoryStorage[e], r == null ? null : Vs(r, null);
    } catch (i) {
      return A("error", "Failed to get item:", e, i), null;
    }
  }
  removeItem(e) {
    try {
      const i = this._getStorage();
      return i ? i.removeItem(e) : delete this.memoryStorage[e], !0;
    } catch (i) {
      return A("error", "Failed to remove item:", e, i), !1;
    }
  }
  hasItem(e) {
    const i = this.getItem(e);
    return i != null;
  }
  clear() {
    try {
      const e = this._getStorage();
      return e ? Object.keys(e).forEach((r) => {
        r.startsWith("__rg_") && e.removeItem(r);
      }) : this.memoryStorage = {}, !0;
    } catch (e) {
      return A("error", "Failed to clear storage:", e), !1;
    }
  }
  _cleanup() {
    const e = this._getStorage();
    if (e)
      try {
        ["__rg_event_queue"].forEach((r) => {
          e.removeItem(r);
        });
      } catch (i) {
        A("error", "Cleanup failed:", i);
      }
  }
  getStorageType() {
    return this.storageType;
  }
  isPersistent() {
    return this.storageType !== "memory";
  }
}
class Js {
  constructor(e, i) {
    this.storage = e, this.config = i, this.visitorId = null, this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this.sessionId = null, this.sessionStartTime = null, this.sessionLastActivity = null, this.sessionEventCount = 0, this.sessionProperties = {}, this.pendingIdentity = null;
  }
  initialize() {
    this._loadVisitor(), this._loadAccount(), this._loadOrCreateSession(), this.pendingIdentity && (this.identify(this.pendingIdentity.visitor, this.pendingIdentity.account), this.pendingIdentity = null), A("info", "Identity initialized:", {
      visitorId: this.visitorId,
      accountId: this.accountId,
      sessionId: this.sessionId
    });
  }
  _loadVisitor() {
    const e = this.storage.getItem(J.VISITOR_ID), i = this.storage.getItem(J.VISITOR_TRAITS) || {};
    e ? (this.visitorId = e, this.visitorTraits = i) : (this.visitorId = "anon_" + ft(), this._persistVisitor());
  }
  _loadAccount() {
    const e = this.storage.getItem(J.ACCOUNT_ID), i = this.storage.getItem(J.ACCOUNT_TRAITS) || {};
    e && (this.accountId = e, this.accountTraits = i);
  }
  _loadOrCreateSession() {
    const e = this.storage.getItem(J.SESSION_ID), i = this.storage.getItem(J.SESSION_START), r = this.storage.getItem(J.SESSION_LAST_ACTIVITY), o = Date.now(), s = this.config.sessionTimeout * 60 * 1e3;
    if (e && r && o - new Date(r).getTime() < s) {
      this.sessionId = e, this.sessionStartTime = i, this.sessionLastActivity = r, this._updateSessionActivity();
      return;
    }
    this._createNewSession();
  }
  _createNewSession() {
    this.sessionId = "sess_" + ft(), this.sessionStartTime = mt(), this.sessionLastActivity = mt(), this.sessionEventCount = 0, this._captureSessionProperties(), this._persistSession(), A("info", "New session created:", this.sessionId);
  }
  _captureSessionProperties() {
    const e = window.location.href, i = qs(e);
    this.sessionProperties = {
      referrer: document.referrer || null,
      referrer_domain: document.referrer ? new URL(document.referrer).hostname : null,
      utm_source: i.utm_source || null,
      utm_medium: i.utm_medium || null,
      utm_campaign: i.utm_campaign || null,
      utm_term: i.utm_term || null,
      utm_content: i.utm_content || null,
      landing_page: e
    };
  }
  _updateSessionActivity() {
    this.sessionLastActivity = mt(), this.sessionEventCount++, this.storage.setItem(J.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  _persistVisitor() {
    this.storage.setItem(J.VISITOR_ID, this.visitorId), this.storage.setItem(J.VISITOR_TRAITS, this.visitorTraits);
  }
  _persistAccount() {
    this.accountId && (this.storage.setItem(J.ACCOUNT_ID, this.accountId), this.storage.setItem(J.ACCOUNT_TRAITS, this.accountTraits));
  }
  _persistSession() {
    this.storage.setItem(J.SESSION_ID, this.sessionId), this.storage.setItem(J.SESSION_START, this.sessionStartTime), this.storage.setItem(J.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  identify(e, i = null) {
    if (e && e.id) {
      this.visitorId && this.visitorId !== e.id && !this.visitorId.startsWith("anon_") && A("warn", `Visitor ID changed from ${this.visitorId} to ${e.id}`), this.visitorId = e.id;
      const { id: r, ...o } = e;
      this.visitorTraits = fi(this.visitorTraits, o), this._persistVisitor();
    }
    if (i && i.id) {
      this.accountId && this.accountId !== i.id && A("info", `Account changed from ${this.accountId} to ${i.id}`), this.accountId = i.id;
      const { id: r, ...o } = i;
      this.accountTraits = fi(this.accountTraits, o), this._persistAccount();
    }
    A("info", "Identity updated:", {
      visitorId: this.visitorId,
      accountId: this.accountId
    });
  }
  queueIdentify(e, i = null) {
    this.pendingIdentity = { visitor: e, account: i };
  }
  getIdentityContext() {
    this._updateSessionActivity();
    const e = this.sessionStartTime ? Math.floor(/* @__PURE__ */ new Date() - new Date(this.sessionStartTime)) : 0;
    return {
      visitor_id: this.visitorId,
      account_id: this.accountId,
      session_id: this.sessionId,
      session_start_time: this.sessionStartTime,
      session_duration_ms: e,
      session_event_count: this.sessionEventCount,
      visitor_email: this.visitorTraits.email || null,
      visitor_name: this._getVisitorName(),
      visitor_role: this.visitorTraits.role || null,
      visitor_created_at: this.visitorTraits.createdAt || null,
      visitor_custom: this._getCustomVisitorTraits(),
      account_name: this.accountTraits.name || null,
      account_plan: this.accountTraits.plan || null,
      account_mrr: this.accountTraits.mrr || null,
      account_industry: this.accountTraits.industry || null,
      account_custom: this._getCustomAccountTraits(),
      ...this.sessionProperties
    };
  }
  _getVisitorName() {
    if (this.visitorTraits.name)
      return this.visitorTraits.name;
    const e = this.visitorTraits.firstName || "", i = this.visitorTraits.lastName || "";
    return (e || i) && [e, i].filter(Boolean).join(" ").trim() || null;
  }
  _getCustomVisitorTraits() {
    const e = ["email", "name", "role", "createdAt"], i = {};
    for (const r in this.visitorTraits)
      e.includes(r) || (i[r] = this.visitorTraits[r]);
    return Object.keys(i).length > 0 ? i : null;
  }
  _getCustomAccountTraits() {
    const e = ["name", "plan", "mrr", "industry"], i = {};
    for (const r in this.accountTraits)
      e.includes(r) || (i[r] = this.accountTraits[r]);
    return Object.keys(i).length > 0 ? i : null;
  }
  getVisitorId() {
    return this.visitorId;
  }
  getAccountId() {
    return this.accountId;
  }
  getSessionId() {
    return this.sessionId;
  }
  reset() {
    this.storage.removeItem(J.VISITOR_ID), this.storage.removeItem(J.VISITOR_TRAITS), this.storage.removeItem(J.ACCOUNT_ID), this.storage.removeItem(J.ACCOUNT_TRAITS), this.storage.removeItem(J.SESSION_ID), this.storage.removeItem(J.SESSION_START), this.storage.removeItem(J.SESSION_LAST_ACTIVITY), this.visitorId = "anon_" + ft(), this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this._createNewSession(), this._persistVisitor(), A("info", "Identity reset");
  }
}
class Zs {
  constructor(e) {
    this.identityManager = e, this.deviceInfo = this._captureDeviceInfo();
  }
  _captureDeviceInfo() {
    const { browserName: e, browserVersion: i } = Gs(), { osName: r, osVersion: o } = $s();
    return {
      device_type: Ws(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      browser_name: e,
      browser_version: i,
      os_name: r,
      os_version: o,
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: Hs()
    };
  }
  _readCoreContext() {
    try {
      const e = sessionStorage.getItem("__rg_core_context");
      return e ? JSON.parse(e) : null;
    } catch {
      return null;
    }
  }
  buildEvent(e) {
    const i = mt(), r = this.identityManager.getIdentityContext(), o = {
      event_id: "evt_" + ft(),
      visitor_id: r.visitor_id,
      account_id: r.account_id,
      session_id: r.session_id,
      event_name: e.event_name,
      event_type: e.event_type,
      timestamp: i,
      event_date: Bs(),
      page_url: window.location.href,
      page_title: document.title,
      page_path: window.location.pathname,
      page_hash: window.location.hash || null,
      page_query: window.location.search || null,
      element_id: e.element_id || null,
      element_classes: e.element_class || [],
      element_tag: e.element_tag || null,
      element_text: e.element_text || null,
      element_href: e.element_href || null,
      element_xpath: e.element_xpath || null,
      element_selector: e.element_selector || null,
      session_start_time: r.session_start_time,
      session_duration_ms: r.session_duration_ms,
      session_event_count: r.session_event_count,
      visitor_email: r.visitor_email,
      visitor_name: r.visitor_name,
      visitor_role: r.visitor_role,
      visitor_created_at: r.visitor_created_at,
      visitor_custom: r.visitor_custom,
      account_name: r.account_name,
      account_plan: r.account_plan,
      account_mrr: r.account_mrr,
      account_industry: r.account_industry,
      account_custom: r.account_custom,
      ...this.deviceInfo,
      referrer: r.referrer,
      referrer_domain: r.referrer_domain,
      utm_source: r.utm_source,
      utm_medium: r.utm_medium,
      utm_campaign: r.utm_campaign,
      utm_term: r.utm_term,
      utm_content: r.utm_content,
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      properties: e.custom_properties || null,
      interaction_type: e.interaction_type || "normal",
      sdk_version: Ii,
      sdk_name: tr,
      sdk_source: Ls,
      data_version: zs,
      captured_at: i,
      error_message: e.error_message || null,
      error_stack: e.error_stack || null,
      console_logs: e.console_logs || null,
      is_core_event: !1
    }, s = this._readCoreContext();
    return s && s.page_path === window.location.pathname && (s.is_core_page || s.core_feature_xpaths && s.core_feature_xpaths.length > 0 && e.event_name === "click" && e.element_xpath && s.core_feature_xpaths.includes(e.element_xpath)) && (o.is_core_event = !0), e.event_name === "click" && (o.element_position_x = e.click_x || null, o.element_position_y = e.click_y || null, o.click_button = e.click_button || null, o.modifier_alt = e.modifier_alt || !1, o.modifier_ctrl = e.modifier_ctrl || !1, o.modifier_shift = e.modifier_shift || !1, o.modifier_meta = e.modifier_meta || !1), e.event_name === "scroll" && (o.scroll_depth_percent = e.scroll_depth_percent || null, o.scroll_y = e.scroll_y || null, o.milestone_25 = e.milestone_25 || !1, o.milestone_50 = e.milestone_50 || !1, o.milestone_75 = e.milestone_75 || !1, o.milestone_100 = e.milestone_100 || !1), e.event_name === "input" && (o.element_type = e.element_type || null, o.element_name = e.element_name || null, o.element_placeholder = e.element_placeholder || null, o.form_id = e.form_id || null, o.form_name = e.form_name || null, o.field_value = null), e.event_name === "error" && (o.error_type = e.error_type || null, o.error_line = e.error_line || null, o.error_column = e.error_column || null, o.error_filename = e.error_filename || null), e._originalElement && (o._originalElement = e._originalElement), o;
  }
  buildPageViewEvent(e = {}) {
    return this.buildEvent({
      event_name: "page_view",
      event_type: "navigation",
      custom_properties: e
    });
  }
  buildCustomEvent(e, i = {}) {
    return this.buildEvent({
      event_name: e,
      event_type: "custom",
      custom_properties: i
    });
  }
  updateDeviceInfo() {
    this.deviceInfo.viewport_width = window.innerWidth, this.deviceInfo.viewport_height = window.innerHeight;
  }
}
class ea {
  constructor(e, i) {
    this.storage = e, this.config = i, this.consentGranted = !i.requireConsent;
  }
  processEvent(e) {
    return this.isOptedOut() || this.config.requireConsent && !this.consentGranted || this.isInDoNotProcessList(e.visitor_id) || e._originalElement && this.isSensitiveElement(e._originalElement) ? null : (e = this.maskPII(e), e = this.removeBlacklistedFields(e), delete e._originalElement, e);
  }
  isOptedOut() {
    return this.storage.getItem(J.OPT_OUT) === !0;
  }
  isInDoNotProcessList(e) {
    return this.config.doNotProcess?.includes(e) || !1;
  }
  isSensitiveElement(e) {
    if (!e) return !1;
    const i = this.config.privacyConfig?.sensitiveSelectors || [];
    for (const r of i)
      try {
        if (e.matches(r) || e.closest(r))
          return !0;
      } catch {
        A("warn", "Invalid sensitive selector:", r);
      }
    return !1;
  }
  maskPII(e) {
    const i = ["element_text", "error_message", "error_stack", "page_url", "page_title"];
    for (const r of i)
      e[r] && typeof e[r] == "string" && (e[r] = this.maskPIIInText(e[r]));
    return e.custom_properties && (e.custom_properties = this._maskPIIInObject(e.custom_properties)), e.console_logs && Array.isArray(e.console_logs) && (e.console_logs = e.console_logs.map((r) => this.maskPIIInText(r))), e;
  }
  maskPIIInText(e) {
    if (!e) return e;
    let i = e;
    i = i.replace(dt.email, "[EMAIL_REDACTED]"), i = i.replace(dt.phone, "[PHONE_REDACTED]"), i = i.replace(dt.ssn, "[SSN_REDACTED]"), i = i.replace(dt.creditCard, "[CC_REDACTED]"), i = i.replace(dt.ipAddress, "[IP_REDACTED]");
    const r = this.config.privacyConfig?.customPIIPatterns || [];
    for (const o of r)
      try {
        i = i.replace(o, "[REDACTED]");
      } catch {
        A("warn", "Invalid custom PII pattern:", o);
      }
    return i;
  }
  _maskPIIInObject(e) {
    if (!e || typeof e != "object") return e;
    const i = Array.isArray(e) ? [] : {};
    for (const r in e) {
      const o = e[r];
      typeof o == "string" ? i[r] = this.maskPIIInText(o) : typeof o == "object" && o !== null ? i[r] = this._maskPIIInObject(o) : i[r] = o;
    }
    return i;
  }
  removeBlacklistedFields(e) {
    const i = [
      "field_value",
      "clipboard_content",
      "localStorage_keys",
      "cookies",
      "_originalElement"
    ];
    for (const r of i)
      delete e[r];
    return e;
  }
  shouldMaskInput() {
    return this.config.privacyConfig?.maskInputs !== !1;
  }
  shouldMaskTextContent() {
    return this.config.privacyConfig?.maskTextContent === !0;
  }
  grantConsent() {
    this.consentGranted = !0, A("info", "User consent granted");
  }
  revokeConsent() {
    this.consentGranted = !1, A("info", "User consent revoked");
  }
  optOut() {
    this.storage.setItem(J.OPT_OUT, !0), A("info", "User opted out");
  }
  optIn() {
    this.storage.removeItem(J.OPT_OUT), A("info", "User opted in");
  }
  validateEventSize(e) {
    const i = JSON.stringify(e).length, r = 10 * 1024;
    return i > r ? (A("warn", "Event exceeds max size, truncating:", i), this.truncateEvent(e)) : e;
  }
  truncateEvent(e) {
    return e.element_text && (e.element_text = pi(e.element_text, 100)), e.error_stack && (e.error_stack = pi(e.error_stack, 500)), e.console_logs && (e.console_logs = e.console_logs.slice(0, 5)), e.custom_properties && JSON.stringify(e.custom_properties).length > 5e3 && (e.custom_properties = { _truncated: !0 }), e;
  }
  sanitizeURL(e) {
    try {
      const i = new URL(e);
      return ["token", "key", "password", "secret", "api_key", "access_token"].forEach((o) => {
        i.searchParams.has(o) && i.searchParams.set(o, "[REDACTED]");
      }), i.toString();
    } catch {
      return e;
    }
  }
}
class ta {
  constructor() {
    this.clickHistory = [], this.deadClickTimers = /* @__PURE__ */ new Map(), this.recentErrors = [], this.navigationHistory = [], this._setupErrorListener(), this._setupNavigationListener();
  }
  detectClickInteraction(e, i) {
    const r = this._getElementKey(e), o = Date.now();
    return this._detectRageClick(r, o) ? pt.RAGE_CLICK : this._detectErrorClick(r, o) ? pt.ERROR_CLICK : (this._scheduleDeadClickCheck(e, r, o), pt.NORMAL);
  }
  detectUTurn() {
    const e = Date.now(), i = this.navigationHistory;
    if (i.length < 2) return !1;
    const r = i[i.length - 1], o = i[i.length - 2];
    return r.url === o.url && e - o.time < ct.uturnThreshold;
  }
  _detectRageClick(e, i) {
    return this.clickHistory.push({ elementKey: e, time: i }), this.clickHistory = this.clickHistory.filter(
      (o) => i - o.time < ct.rageClickWindow
    ), this.clickHistory.filter(
      (o) => o.elementKey === e
    ).length >= ct.rageClickThreshold;
  }
  _detectErrorClick(e, i) {
    return this.recentErrors = this.recentErrors.filter(
      (r) => i - r.time < ct.errorClickWindow
    ), this.recentErrors.length > 0;
  }
  _scheduleDeadClickCheck(e, i, r) {
    this.deadClickTimers.has(i) && clearTimeout(this.deadClickTimers.get(i));
    const o = setTimeout(() => {
      this._isDeadClick(e, r) && A("debug", "Dead click detected:", i), this.deadClickTimers.delete(i);
    }, ct.deadClickDelay);
    this.deadClickTimers.set(i, o);
  }
  _isDeadClick(e) {
    const i = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
    if (i.includes(e.tagName) || e.onclick || e.hasAttribute("onclick"))
      return !1;
    let r = e.parentElement;
    for (; r; ) {
      if (i.includes(r.tagName))
        return !1;
      r = r.parentElement;
    }
    return !0;
  }
  _setupErrorListener() {
    window.addEventListener("error", (e) => {
      this.recentErrors.push({
        message: e.message,
        time: Date.now()
      });
    }), window.addEventListener("unhandledrejection", (e) => {
      this.recentErrors.push({
        message: e.reason?.message || "Promise rejection",
        time: Date.now()
      });
    });
  }
  _setupNavigationListener() {
    this.navigationHistory.push({
      url: window.location.href,
      time: Date.now()
    });
    const e = () => {
      this.navigationHistory.push({
        url: window.location.href,
        time: Date.now()
      }), this.navigationHistory.length > 10 && this.navigationHistory.shift();
    }, i = history.pushState, r = history.replaceState;
    history.pushState = function(...o) {
      i.apply(this, o), e();
    }, history.replaceState = function(...o) {
      r.apply(this, o), e();
    }, window.addEventListener("popstate", e);
  }
  _getElementKey(e) {
    if (e.id) return `#${e.id}`;
    const i = e.tagName?.toLowerCase(), r = (e.textContent || "").substring(0, 20), o = e.getBoundingClientRect();
    return `${i}:${r}:${Math.round(o.left)},${Math.round(o.top)}`;
  }
  destroy() {
    this.deadClickTimers.forEach((e) => clearTimeout(e)), this.deadClickTimers.clear(), this.clickHistory = [], this.recentErrors = [], this.navigationHistory = [];
  }
}
class ia {
  constructor(e, i, r) {
    this.eventBuilder = e, this.privacyEngine = i, this.config = r, this.listeners = [], this.lastPageViewTime = 0, this.lastPageViewUrl = null, this.scrollMilestones = {
      25: !1,
      50: !1,
      75: !1,
      100: !1
    }, this.rateLimiters = {}, this.onEventCapture = null, this.isRunning = !1, this.behavioralDetector = new ta();
  }
  start(e) {
    if (this.isRunning) {
      A("warn", "Auto-capture already running");
      return;
    }
    this.onEventCapture = e, this.isRunning = !0, this.config.autoPageViews && this._startPageViewTracking(), this.config.autoCapture && (this._startClickTracking(), this._startInputTracking(), this._startScrollTracking(), this._startErrorTracking()), A("info", "Auto-capture started");
  }
  stop() {
    this.isRunning && (this.listeners.forEach(({ target: e, event: i, handler: r, options: o }) => {
      e.removeEventListener(i, r, o);
    }), this.listeners = [], this.behavioralDetector && this.behavioralDetector.destroy(), this.isRunning = !1, A("info", "Auto-capture stopped"));
  }
  _addListener(e, i, r, o = !1) {
    e.addEventListener(i, r, o), this.listeners.push({ target: e, event: i, handler: r, options: o });
  }
  _checkRateLimit(e) {
    const i = Us[e];
    if (!i) return !0;
    this.rateLimiters[e] || (this.rateLimiters[e] = []);
    const r = Date.now(), o = this.rateLimiters[e];
    return this.rateLimiters[e] = o.filter((s) => r - s < i.window), this.rateLimiters[e].length >= i.limit ? !1 : (this.rateLimiters[e].push(r), !0);
  }
  _emit(e) {
    if (!this.onEventCapture) return;
    const i = this.eventBuilder.buildEvent(e), r = this.privacyEngine.processEvent(i);
    r && this.onEventCapture(r);
  }
  _startPageViewTracking() {
    this._capturePageView();
    const e = history.pushState, i = history.replaceState, r = vn(() => this._capturePageView(), Zt.pageView);
    history.pushState = function(...o) {
      e.apply(this, o), r();
    }, history.replaceState = function(...o) {
      i.apply(this, o), r();
    }, this._addListener(window, "popstate", () => {
      r();
    }), this._addListener(window, "hashchange", () => {
      r();
    });
  }
  _capturePageView() {
    const e = Date.now(), i = window.location.href;
    if (e - this.lastPageViewTime < Zt.pageView || i === this.lastPageViewUrl)
      return;
    this.lastPageViewTime = e, this.lastPageViewUrl = i, this.scrollMilestones = { 25: !1, 50: !1, 75: !1, 100: !1 };
    const r = this.behavioralDetector.detectUTurn();
    this._emit({
      event_name: Je.PAGE_VIEW,
      event_type: Ze.NAVIGATION,
      interaction_type: r ? pt.U_TURN : pt.NORMAL
    });
  }
  _startClickTracking() {
    this._addListener(
      document,
      "click",
      (e) => this._handleClick(e),
      { capture: !0 }
    );
  }
  _handleClick(e) {
    if (!this._checkRateLimit("click"))
      return;
    const i = e.target;
    if (!Ys(i))
      return;
    const r = this.behavioralDetector.detectClickInteraction(i, e), o = {
      event_name: Je.CLICK,
      event_type: Ze.ENGAGEMENT,
      element_id: i.id || null,
      element_class: i.classList ? Array.from(i.classList) : [],
      element_tag: i.tagName?.toLowerCase() || null,
      element_text: Ks(i),
      element_href: i.href || i.closest("a")?.href || null,
      element_xpath: js(i),
      element_selector: Qs(i),
      click_x: e.clientX,
      click_y: e.clientY,
      click_button: e.button,
      modifier_alt: e.altKey,
      modifier_ctrl: e.ctrlKey,
      modifier_shift: e.shiftKey,
      modifier_meta: e.metaKey,
      interaction_type: r,
      _originalElement: i
    };
    this._emit(o);
  }
  _startInputTracking() {
    this._addListener(
      document,
      "focus",
      (e) => this._handleInput(e, "focus"),
      { capture: !0 }
    ), this._addListener(
      document,
      "blur",
      (e) => this._handleInput(e, "blur"),
      { capture: !0 }
    ), this._addListener(
      document,
      "change",
      (e) => this._handleInput(e, "change"),
      { capture: !0 }
    );
  }
  _handleInput(e, i) {
    const r = e.target;
    if (!this._isFormElement(r) || !this._checkRateLimit("input"))
      return;
    const o = {
      event_name: Je.INPUT,
      event_type: Ze.ENGAGEMENT,
      element_id: r.id || null,
      element_tag: r.tagName?.toLowerCase() || null,
      element_type: r.type || null,
      element_name: r.name || null,
      element_placeholder: r.placeholder || null,
      interaction_type: i,
      form_id: r.form?.id || null,
      form_name: r.form?.name || null,
      field_value: null,
      _originalElement: r
    };
    this._emit(o);
  }
  _isFormElement(e) {
    return ["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName);
  }
  _startScrollTracking() {
    const e = vn(() => this._handleScroll(), Zt.scroll);
    this._addListener(window, "scroll", e);
  }
  _handleScroll() {
    if (!this._checkRateLimit("scroll"))
      return;
    const e = document.documentElement.scrollHeight, i = window.pageYOffset || document.documentElement.scrollTop, r = window.innerHeight, o = e - r, s = o > 0 ? Math.round(i / o * 100) : 100;
    let l = !1;
    const a = { 25: !1, 50: !1, 75: !1, 100: !1 };
    s >= 25 && !this.scrollMilestones[25] && (a[25] = !0, this.scrollMilestones[25] = !0, l = !0), s >= 50 && !this.scrollMilestones[50] && (a[50] = !0, this.scrollMilestones[50] = !0, l = !0), s >= 75 && !this.scrollMilestones[75] && (a[75] = !0, this.scrollMilestones[75] = !0, l = !0), s >= 100 && !this.scrollMilestones[100] && (a[100] = !0, this.scrollMilestones[100] = !0, l = !0), l && this._emit({
      event_name: Je.SCROLL,
      event_type: Ze.ENGAGEMENT,
      scroll_depth_percent: s,
      scroll_y: i,
      milestone_25: a[25],
      milestone_50: a[50],
      milestone_75: a[75],
      milestone_100: a[100]
    });
  }
  _startErrorTracking() {
    this._addListener(window, "error", (e) => {
      this._handleError(e);
    }), this._addListener(window, "unhandledrejection", (e) => {
      this._handlePromiseRejection(e);
    });
  }
  _handleError(e) {
    this._emit({
      event_name: Je.ERROR,
      event_type: Ze.DIAGNOSTIC,
      error_message: e.message,
      error_type: e.error?.name || "Error",
      error_stack: e.error?.stack || null,
      error_line: e.lineno || null,
      error_column: e.colno || null,
      error_filename: e.filename || null
    });
  }
  _handlePromiseRejection(e) {
    const i = e.reason;
    this._emit({
      event_name: Je.ERROR,
      event_type: Ze.DIAGNOSTIC,
      error_message: i?.message || String(i),
      error_type: i?.name || "UnhandledRejection",
      error_stack: i?.stack || null
    });
  }
  capturePage(e, i = {}) {
    this._emit({
      event_name: Je.PAGE_VIEW,
      event_type: Ze.NAVIGATION,
      custom_properties: { page_name: e, ...i }
    });
  }
}
class na {
  constructor(e) {
    this.storage = e, this.queue = [], this.maxSize = Ns, this.maxPersistedSize = Ms, this._restore();
  }
  _restore() {
    try {
      const e = this.storage.getItem(J.EVENT_QUEUE);
      e && Array.isArray(e) && (this.queue = e, A("info", `Restored ${this.queue.length} events from storage`));
    } catch (e) {
      A("error", "Failed to restore events from storage:", e);
    }
  }
  _persist() {
    try {
      const e = this.queue.slice(-this.maxPersistedSize);
      this.storage.setItem(J.EVENT_QUEUE, e);
    } catch (e) {
      A("error", "Failed to persist events to storage:", e);
    }
  }
  enqueue(e) {
    if (this.queue.length >= this.maxSize) {
      const i = this.queue.shift();
      A("warn", "Event queue full, dropping oldest event:", i.event_id);
    }
    return this.queue.push(e), this._persist(), !0;
  }
  peek(e) {
    return this.queue.slice(0, e);
  }
  dequeue(e) {
    const i = this.queue.splice(0, e);
    return this._persist(), i;
  }
  flush() {
    const e = [...this.queue];
    return this.queue = [], this.storage.removeItem(J.EVENT_QUEUE), e;
  }
  size() {
    return this.queue.length;
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  clear() {
    this.queue = [], this.storage.removeItem(J.EVENT_QUEUE), A("info", "Event queue cleared");
  }
  getStats() {
    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      percentFull: Math.round(this.queue.length / this.maxSize * 100)
    };
  }
}
class ra {
  constructor(e, i) {
    this.config = e, this.eventQueue = i, this.batchTimer = null, this.retryQueue = /* @__PURE__ */ new Map(), this.isSending = !1, this.stats = {
      sent: 0,
      failed: 0,
      retried: 0
    };
  }
  start() {
    this.batchTimer && clearInterval(this.batchTimer);
    const e = this.config.batchInterval * 1e3;
    this.batchTimer = setInterval(() => {
      this._processBatch(!0);
    }, e), this._setupUnloadHandler(), A("info", "Transport layer started");
  }
  stop() {
    this.batchTimer && (clearInterval(this.batchTimer), this.batchTimer = null), A("info", "Transport layer stopped");
  }
  _setupUnloadHandler() {
    window.addEventListener("beforeunload", () => {
      this.flushSync();
    }), document.addEventListener("visibilitychange", () => {
      document.visibilityState === "hidden" && this.flushSync();
    });
  }
  _shouldSendBatch() {
    return this.eventQueue.size() >= this.config.batchSize;
  }
  _processBatch(e = !1) {
    this.isSending || this.eventQueue.isEmpty() || !this._shouldSendBatch() && !this._isFlushRequested && !e || this._sendBatch();
  }
  _createBatch() {
    const e = this._isFlushRequested ? this.eventQueue.size() : this.config.batchSize, i = this.eventQueue.peek(e);
    return i.length === 0 ? null : {
      batch_id: "batch_" + ft(),
      events: i,
      event_count: i.length,
      batch_timestamp: mt()
    };
  }
  async _sendBatch(e = null, i = 0) {
    if (e || (e = this._createBatch()), !(!e || e.events.length === 0)) {
      this.isSending = !0;
      try {
        const r = await this._makeRequest(e);
        r.ok ? (this.eventQueue.dequeue(e.events.length), this.stats.sent += e.events.length, A("info", `Batch sent successfully: ${e.events.length} events`)) : await this._handleErrorResponse(r, e, i);
      } catch (r) {
        this._handleNetworkError(r, e, i);
      } finally {
        this.isSending = !1;
      }
    }
  }
  _resolveRequestContext() {
    try {
      const e = localStorage.getItem("customerDetails") ? JSON.parse(localStorage.getItem("customerDetails")) : null, i = localStorage.getItem("RGAuth") ? JSON.parse(localStorage.getItem("RGAuth")) : null, r = localStorage.getItem("selectedViewUser") ? JSON.parse(localStorage.getItem("selectedViewUser")) : null, o = e?.BASE_API_URL_MAIN ? `${e.BASE_API_URL_MAIN}/rg-pex` : this.config.apiHost, s = localStorage.getItem("access_token") || this.config.apiKey, l = r?.id || i?.email || "", a = e?.RG_CUSTOMER_ID || "", u = e?.CUSTOMER_SCHEMA || "", d = r?.role || r?.manager_role, h = sessionStorage.getItem("RGSelectedRole");
      let c;
      d ? c = [d] : h ? c = [h] : c = i?.realm_access?.roles || [];
      const p = c.map((m) => m.replace(/\s+/g, "_")).join(",");
      return { host: o, accessToken: s, iud: l, rcid: a, schema: u, role: p };
    } catch (e) {
      return A("warn", "Failed to resolve request context from localStorage:", e.message), { host: this.config.apiHost, accessToken: this.config.apiKey, iud: "", rcid: "", schema: "", role: "" };
    }
  }
  async _makeRequest(e) {
    const { host: i, accessToken: r, iud: o, rcid: s, schema: l, role: a } = this._resolveRequestContext(), u = `${i}/raw-events`, d = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${r}`,
      "X-RG-SDK-Version": Ii,
      "X-RG-SDK-Name": tr,
      role: a,
      iud: o,
      rcid: s,
      schema: l
    };
    return fetch(u, {
      method: "POST",
      headers: d,
      body: JSON.stringify(e),
      keepalive: !0
    });
  }
  async _handleErrorResponse(e, i, r) {
    const o = e.status;
    if (o >= 400 && o < 500) {
      o === 401 ? A("error", "Invalid API key. Please check your configuration.") : A("error", `Client error (${o}), dropping batch`), this.eventQueue.dequeue(i.events.length), this.stats.failed += i.events.length;
      return;
    }
    (o === 429 || o >= 500) && this._scheduleRetry(i, r);
  }
  _handleNetworkError(e, i, r) {
    A("error", "Network error:", e.message), this._scheduleRetry(i, r);
  }
  _scheduleRetry(e, i) {
    if (i >= bn) {
      A("error", `Max retries exceeded for batch ${e.batch_id}, dropping events`), this.eventQueue.dequeue(e.events.length), this.stats.failed += e.events.length;
      return;
    }
    const r = Jt[i] || Jt[Jt.length - 1], o = Date.now() + r;
    this.retryQueue.set(e.batch_id, {
      batch: e,
      retryCount: i + 1,
      nextRetry: o
    }), this.stats.retried++, A(
      "info",
      `Scheduling retry ${i + 1}/${bn} for batch ${e.batch_id} in ${r}ms`
    ), setTimeout(() => {
      const s = this.retryQueue.get(e.batch_id);
      s && (this.retryQueue.delete(e.batch_id), this._sendBatch(s.batch, s.retryCount));
    }, r);
  }
  async flush() {
    if (!this.eventQueue.isEmpty()) {
      for (A("info", "Flushing event queue..."), this._isFlushRequested = !0; !this.eventQueue.isEmpty() && !this.isSending; )
        await this._sendBatch();
      this._isFlushRequested = !1;
    }
  }
  flushSync() {
    if (this.eventQueue.isEmpty())
      return;
    const e = this._createBatch();
    if (e)
      if (navigator.sendBeacon) {
        const { host: i } = this._resolveRequestContext(), r = `${i}/raw-events`, o = JSON.stringify(e);
        navigator.sendBeacon(r, o) ? (this.eventQueue.dequeue(e.events.length), A("info", `Sent ${e.events.length} events via sendBeacon`)) : A("warn", "sendBeacon failed, events may be lost");
      } else
        A("warn", "sendBeacon not available, events may be lost");
  }
  checkBatchSize() {
    this._shouldSendBatch() && this._processBatch();
  }
  getStats() {
    return {
      ...this.stats,
      queueSize: this.eventQueue.size(),
      pendingRetries: this.retryQueue.size
    };
  }
  resetStats() {
    this.stats = {
      sent: 0,
      failed: 0,
      retried: 0
    };
  }
}
class oa {
  constructor() {
    this.initialized = !1, this.config = null, this.storage = null, this.identityManager = null, this.eventBuilder = null, this.privacyEngine = null, this.autoCaptureEngine = null, this.eventQueue = null, this.transportLayer = null, this.pendingIdentify = null;
  }
  initialize(e) {
    if (this.initialized) {
      A("warn", "SDK already initialized");
      return;
    }
    if (!e || !e.apiKey)
      throw new Error("API key is required");
    this.config = fi(Ds, e), A("info", "Initializing RG SDK...", {
      version: Ii,
      config: this.config
    }), this._initializeModules(), this.initialized = !0, this.pendingIdentify && (this.identify(this.pendingIdentify.visitor, this.pendingIdentify.account), this.pendingIdentify = null), A("info", "RG SDK initialized successfully");
  }
  _initializeModules() {
    this.storage = new Xs(this.config.persistence), this.identityManager = new Js(this.storage, this.config), this.identityManager.initialize(), this.eventBuilder = new Zs(this.identityManager), this.privacyEngine = new ea(this.storage, this.config), this.eventQueue = new na(this.storage), this.transportLayer = new ra(this.config, this.eventQueue), this.transportLayer.start(), this.autoCaptureEngine = new ia(
      this.eventBuilder,
      this.privacyEngine,
      this.config
    ), (this.config.autoCapture || this.config.autoPageViews) && this.autoCaptureEngine.start((e) => this._handleCapturedEvent(e));
  }
  _handleCapturedEvent(e) {
    e = this.privacyEngine.validateEventSize(e), this.eventQueue.enqueue(e), this.transportLayer.checkBatchSize();
  }
  identify(e, i = null) {
    if (!this.initialized) {
      this.pendingIdentify = { visitor: e, account: i }, A("info", "Identity queued, will be applied after initialization");
      return;
    }
    this.identityManager.identify(e, i);
  }
  track(e, i = {}) {
    if (!this.initialized) {
      A("warn", "SDK not initialized, cannot track event");
      return;
    }
    if (!e || typeof e != "string") {
      A("warn", "Event name is required and must be a string");
      return;
    }
    const r = this.eventBuilder.buildCustomEvent(e, i), o = this.privacyEngine.processEvent(r);
    if (o) {
      const s = this.privacyEngine.validateEventSize(o);
      this.eventQueue.enqueue(s), this.transportLayer.checkBatchSize();
    }
  }
  page(e = null, i = {}) {
    if (!this.initialized) {
      A("warn", "SDK not initialized, cannot track page view");
      return;
    }
    const r = { ...i };
    e && (r.page_name = e);
    const o = this.eventBuilder.buildPageViewEvent(r), s = this.privacyEngine.processEvent(o);
    if (s) {
      const l = this.privacyEngine.validateEventSize(s);
      this.eventQueue.enqueue(l), this.transportLayer.checkBatchSize();
    }
  }
  async flush() {
    if (!this.initialized) {
      A("warn", "SDK not initialized");
      return;
    }
    await this.transportLayer.flush();
  }
  optOut() {
    if (!this.initialized) {
      A("warn", "SDK not initialized");
      return;
    }
    this.autoCaptureEngine && this.autoCaptureEngine.stop(), this.eventQueue.clear(), this.privacyEngine.optOut(), A("info", "User opted out of tracking");
  }
  optIn() {
    if (!this.initialized) {
      A("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.optIn(), (this.config.autoCapture || this.config.autoPageViews) && this.autoCaptureEngine.start((e) => this._handleCapturedEvent(e)), A("info", "User opted in to tracking");
  }
  grantConsent() {
    if (!this.initialized) {
      A("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.grantConsent();
  }
  revokeConsent() {
    if (!this.initialized) {
      A("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.revokeConsent(), this.eventQueue.clear();
  }
  reset() {
    if (!this.initialized) {
      A("warn", "SDK not initialized");
      return;
    }
    this.identityManager.reset(), A("info", "Identity reset");
  }
  getVisitorId() {
    return this.initialized ? this.identityManager.getVisitorId() : null;
  }
  getAccountId() {
    return this.initialized ? this.identityManager.getAccountId() : null;
  }
  getSessionId() {
    return this.initialized ? this.identityManager.getSessionId() : null;
  }
  getStats() {
    return this.initialized ? {
      queue: this.eventQueue.getStats(),
      transport: this.transportLayer.getStats(),
      storage: {
        type: this.storage.getStorageType(),
        persistent: this.storage.isPersistent()
      }
    } : null;
  }
  debug(e = !0) {
    this.config.debug = e, A("info", `Debug mode ${e ? "enabled" : "disabled"}`);
  }
}
const Ce = new oa(), Fe = {
  initialize: (t) => {
    Ce.initialize(t);
  },
  identify: (t, e) => {
    Ce.identify(t, e);
  },
  track: (t, e) => {
    Ce.track(t, e);
  },
  page: (t, e) => {
    Ce.page(t, e);
  },
  flush: () => Ce.flush(),
  optOut: () => {
    Ce.optOut();
  },
  optIn: () => {
    Ce.optIn();
  },
  grantConsent: () => {
    Ce.grantConsent();
  },
  revokeConsent: () => {
    Ce.revokeConsent();
  },
  reset: () => {
    Ce.reset();
  },
  getVisitorId: () => Ce.getVisitorId(),
  getAccountId: () => Ce.getAccountId(),
  getSessionId: () => Ce.getSessionId(),
  getStats: () => Ce.getStats(),
  debug: (t) => {
    Ce.debug(t);
  },
  version: "1.0.0"
};
typeof window < "u" && (window.rg = Fe);
let fe = null, ir = !1;
const nr = "designerGuideId", rr = "designerTemplateId";
let or = null, sr = null;
function sa() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(nr) : null;
  } catch {
    return null;
  }
}
function aa() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(rr) : null;
  } catch {
    return null;
  }
}
function Ge(t) {
  return t?.apiKey ? Fe.initialize(t) : console.warn("[Revgain] No apiKey found in config. Analytics will not start."), fe || (fe = new er({
    ...t,
    guideId: or ?? t?.guideId ?? sa() ?? null,
    templateId: sr ?? t?.templateId ?? aa() ?? null
  }), fe.init(), fe);
}
function Ti(t, e) {
  Fe.identify(t, e);
}
function Ri(t, e) {
  Fe.track(t, e);
}
function Nt() {
  return fe;
}
function ar(t) {
  if (!t || !Array.isArray(t)) return;
  t.splice(0, t.length).forEach((i) => {
    if (!i || !Array.isArray(i) || i.length === 0) return;
    const r = i[0], o = i.slice(1);
    try {
      switch (r) {
        case "initialize":
        case "init":
          Ge(o[0]);
          break;
        case "identify":
          Ti(o[0], o[1]);
          break;
        case "track":
          Ri(o[0], o[1]);
          break;
        case "enableEditor":
          (fe ?? Ge()).enableEditor();
          break;
        case "disableEditor":
          fe?.disableEditor();
          break;
        case "loadGuides":
          fe?.loadGuides();
          break;
        case "getGuides":
          return fe?.getGuides();
        default:
          typeof Fe[r] == "function" ? Fe[r](...o) : console.warn("[Revgain] Unknown snippet method:", r);
      }
    } catch (s) {
      console.error("[Revgain] Error processing queued call:", r, s);
    }
  });
}
if (typeof window < "u") {
  const t = window.revgain || window.visualDesigner;
  t && Array.isArray(t._q) && (ir = !0, t.init = Ge, t.initialize = Ge, t.identify = Ti, t.track = Ri, t.enableEditor = () => (fe ?? Ge()).enableEditor(), t.disableEditor = () => fe?.disableEditor(), t.loadGuides = () => fe?.loadGuides(), t.getGuides = () => fe?.getGuides(), t.getInstance = Nt, t.page = (e, i) => Fe.page(e, i), t.flush = () => Fe.flush(), t.reset = () => Fe.reset(), ar(t._q));
  try {
    const e = new URL(window.location.href), i = e.searchParams.get("designer"), r = e.searchParams.get("mode"), o = e.searchParams.get("iud"), s = e.searchParams.get("guide_id"), l = e.searchParams.get("template_id");
    (i === "true" || s != null || l != null) && console.log("[Revgain] URL params detected:", { designerParam: i, modeParam: r, guideIdParam: s }), i === "true" && (r && (window.__visualDesignerMode = r, localStorage.setItem("designerModeType", r)), localStorage.setItem("designerMode", "true"), o && localStorage.setItem(Uo, o), s != null && (or = s, localStorage.setItem(nr, s)), l != null && (sr = l, localStorage.setItem(rr, l)), e.searchParams.delete("designer"), e.searchParams.delete("mode"), e.searchParams.delete("iud"), e.searchParams.delete("guide_id"), e.searchParams.delete("template_id"), window.history.replaceState({}, "", e.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !fe && !ir) {
  const t = localStorage.getItem("designerMode") === "true", e = () => {
    !fe && t && Ge();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
if (typeof window < "u") {
  const t = {
    init: Ge,
    initialize: Ge,
    identify: Ti,
    track: Ri,
    page: (e, i) => Fe.page(e, i),
    flush: () => Fe.flush(),
    reset: () => Fe.reset(),
    getInstance: Nt,
    DesignerSDK: er,
    apiClient: Oe,
    _processQueue: ar,
    getGuideId: () => Nt()?.getGuideId() ?? null,
    getTemplateId: () => Nt()?.getTemplateId() ?? null,
    enableEditor: () => (fe ?? Ge()).enableEditor(),
    disableEditor: () => fe?.disableEditor(),
    analytics: Fe
  };
  window.revgain = t, window.VisualDesigner = t;
}
export {
  er as DesignerSDK,
  ar as _processQueue,
  Oe as apiClient,
  Nt as getInstance,
  Ti as identify,
  Ge as init,
  Fe as rg,
  Ri as track
};
