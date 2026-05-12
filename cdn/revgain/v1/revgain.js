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
    const s = this.getSemanticDataAttributes(e);
    if (s.length > 0) {
      const a = s[0], u = e.getAttribute(a);
      return {
        selector: `[${a}="${this.escapeAttribute(u)}"]`,
        confidence: "high",
        method: "data-attribute"
      };
    }
    const o = this.generateAriaSelector(e);
    if (o)
      return { selector: o, confidence: "medium", method: "aria" };
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
    const s = i.join("/");
    let o = s ? `/${s}` : "";
    return o.startsWith("/html") || (o = "/html[1]" + (o.startsWith("/") ? o : "/" + o)), o;
  }
  static findElement(e) {
    try {
      if (e.startsWith("/") || e.startsWith("//"))
        return this.findElementByXPath(e);
      const i = this.parseContainsAndDescendant(e);
      if (i) {
        const s = this.findElementWithContains(i.anchorPart);
        if (!s) return null;
        if (i.descendantPart) {
          const o = s.querySelector(i.descendantPart);
          return o || null;
        }
        return s;
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
    const r = e.indexOf(i[0]) + i[0].length, s = e.slice(r), o = s.indexOf(" > ");
    return o === -1 ? null : {
      anchorPart: e.slice(0, r + o).trim(),
      descendantPart: s.slice(o + 3).trim() || null
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
    const r = i[1].trim(), s = i[2].replace(/\\'/g, "'"), o = this.normalizeText(s), l = document.querySelectorAll(r);
    for (let a = 0; a < l.length; a++)
      if (this.normalizeText(l[a].textContent || "").includes(o)) return l[a];
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
    return new Promise((r, s) => {
      const o = this.findElement(e);
      if (o) return r(o);
      const l = new MutationObserver(() => {
        const a = this.findElement(e);
        a && (l.disconnect(), r(a));
      });
      l.observe(document.body, {
        childList: !0
      }), setTimeout(() => {
        l.disconnect(), s(new Error(`Element not found: ${e}`));
      }, i);
    });
  }
  static getSemanticDataAttributes(e) {
    const i = ["data-id", "data-name", "data-role", "data-component", "data-element"], r = [];
    for (const s of i)
      e.hasAttribute(s) && r.push(s);
    for (let s = 0; s < e.attributes.length; s++) {
      const o = e.attributes[s];
      o.name.startsWith("data-") && !r.includes(o.name) && r.push(o.name);
    }
    return r;
  }
  static generateAriaSelector(e) {
    const i = e.getAttribute("role"), r = e.getAttribute("aria-label");
    if (i) {
      let s = `[role="${this.escapeAttribute(i)}"]`;
      return r && (s += `[aria-label="${this.escapeAttribute(r)}"]`), s;
    }
    return null;
  }
  static generatePathSelector(e) {
    const i = [];
    let r = e;
    for (; r && r !== document.body && r !== document.documentElement; ) {
      let s = r.tagName.toLowerCase();
      if (r.id) {
        s += `#${this.escapeSelector(r.id)}`, i.unshift(s);
        break;
      }
      if (r.className && typeof r.className == "string") {
        const l = r.className.split(/\s+/).filter((a) => a && !a.startsWith("designer-")).slice(0, 2);
        l.length > 0 && (s += "." + l.map((a) => this.escapeSelector(a)).join("."));
      }
      const o = r.parentElement;
      if (o) {
        const l = Array.from(o.children).filter(
          (a) => a.tagName === r.tagName
        );
        l.length > 1 && (s += `:nth-of-type(${l.indexOf(r) + 1})`);
      }
      if (i.unshift(s), r = o, i.length >= 5) break;
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
      const s = e.className.split(/\s+/).filter((o) => o && !o.startsWith("designer-")).slice(0, 2);
      s.length > 0 && (i += "." + s.map((o) => this.escapeSelector(o)).join("."));
    }
    const r = e.parentElement;
    if (r) {
      const s = Array.from(r.children).filter((o) => o.tagName === e.tagName);
      s.length > 1 && (i += `:nth-of-type(${s.indexOf(e) + 1})`);
    }
    return i;
  }
  /** Path from ancestor down to element (inclusive): [ancestor, ..., element] */
  static getPathFromAncestorToElement(e, i) {
    const r = [];
    let s = i;
    for (; s && s !== e; )
      r.unshift(s), s = s.parentElement;
    return s === e && r.unshift(e), r;
  }
  /** Contains selector when element has meaningful text: path + :contains('text') */
  static generateContainsSelector(e) {
    const r = (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
    if (r.length < 2) return null;
    const s = this.generatePathSelector(e);
    if (!s) return null;
    const o = r.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return {
      selector: `${s}:contains('${o}')`,
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
    const { anchor: r, hasId: s } = i, o = this.getPathFromAncestorToElement(r, e);
    if (o.length < 2 || o.length > 12) return null;
    const a = [];
    if (s) {
      a.push(`#${this.escapeSelector(r.id)}`);
      for (let u = 1; u < o.length; u++) a.push(this.buildSegment(o[u]));
    } else {
      const u = (r.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (u.length < 2) return null;
      const d = this.generatePathSelector(r);
      if (!d) return null;
      const h = u.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      a.push(`${d}:contains('${h}')`);
      for (let c = 1; c < o.length; c++) a.push(this.buildSegment(o[c]));
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
function nr(t) {
  const e = t.getBoundingClientRect(), i = {};
  for (let r = 0; r < t.attributes.length; r++) {
    const s = t.attributes[r];
    i[s.name] = s.value;
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
function ki(t) {
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0" && t.getBoundingClientRect().height > 0 && t.getBoundingClientRect().width > 0;
}
function Je() {
  return window.location.pathname || "/";
}
function Ii() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function rr(t) {
  const e = t.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function Wt(t) {
  rr(t) || t.scrollIntoView({ behavior: "smooth", block: "center" });
}
function ke(t) {
  return t.content && t.content.trim() !== "" ? t.content : t.template?.content || "";
}
const Ti = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class sr {
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
      if (i.closest(Ti)) {
        this.hideHighlight();
        return;
      }
      if (!ki(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (e) => {
    if (!this.isActive) return;
    const i = e.target;
    i && (i.closest(Ti) || (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), ki(i) && this.selectElement(i)));
  };
  handleKeyDown = (e) => {
    this.isActive && e.key === "Escape" && (this.messageCallback?.({ type: "CANCEL" }), this.hideHighlight());
  };
  highlightElement(e) {
    if (!this.highlightOverlay) return;
    const i = e.getBoundingClientRect(), r = window.pageXOffset || document.documentElement.scrollLeft, s = window.pageYOffset || document.documentElement.scrollTop;
    this.highlightOverlay.style.display = "block", this.highlightOverlay.style.left = `${i.left + r}px`, this.highlightOverlay.style.top = `${i.top + s}px`, this.highlightOverlay.style.width = `${i.width}px`, this.highlightOverlay.style.height = `${i.height}px`;
  }
  hideHighlight() {
    this.highlightOverlay && (this.highlightOverlay.style.display = "none");
  }
  selectElement(e) {
    this.highlightElement(e);
    const i = Ne.generateSelector(e), r = nr(e), s = Ne.getXPath(e);
    this.messageCallback?.({
      type: "ELEMENT_SELECTED",
      selector: i.selector,
      elementInfo: r,
      xpath: s
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
var Mt, M, gn, Ye, Ri, yn, _n, bn, ui, Xt, Jt, vn, pt = {}, xn = [], or = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, gt = Array.isArray;
function Be(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function hi(t) {
  t && t.parentNode && t.parentNode.removeChild(t);
}
function Zt(t, e, i) {
  var r, s, o, l = {};
  for (o in e) o == "key" ? r = e[o] : o == "ref" ? s = e[o] : l[o] = e[o];
  if (arguments.length > 2 && (l.children = arguments.length > 3 ? Mt.call(arguments, 2) : i), typeof t == "function" && t.defaultProps != null) for (o in t.defaultProps) l[o] === void 0 && (l[o] = t.defaultProps[o]);
  return At(t, l, r, s, null);
}
function At(t, e, i, r, s) {
  var o = { type: t, props: e, key: i, ref: r, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: s ?? ++gn, __i: -1, __u: 0 };
  return s == null && M.vnode != null && M.vnode(o), o;
}
function Y(t) {
  return t.children;
}
function We(t, e) {
  this.props = t, this.context = e;
}
function rt(t, e) {
  if (e == null) return t.__ ? rt(t.__, t.__i + 1) : null;
  for (var i; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) return i.__e;
  return typeof t.type == "function" ? rt(t) : null;
}
function Sn(t) {
  var e, i;
  if ((t = t.__) != null && t.__c != null) {
    for (t.__e = t.__c.base = null, e = 0; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) {
      t.__e = t.__c.base = i.__e;
      break;
    }
    return Sn(t);
  }
}
function ei(t) {
  (!t.__d && (t.__d = !0) && Ye.push(t) && !Lt.__r++ || Ri != M.debounceRendering) && ((Ri = M.debounceRendering) || yn)(Lt);
}
function Lt() {
  for (var t, e, i, r, s, o, l, a = 1; Ye.length; ) Ye.length > a && Ye.sort(_n), t = Ye.shift(), a = Ye.length, t.__d && (i = void 0, r = void 0, s = (r = (e = t).__v).__e, o = [], l = [], e.__P && ((i = Be({}, r)).__v = r.__v + 1, M.vnode && M.vnode(i), pi(e.__P, i, r, e.__n, e.__P.namespaceURI, 32 & r.__u ? [s] : null, o, s ?? rt(r), !!(32 & r.__u), l), i.__v = r.__v, i.__.__k[i.__i] = i, Cn(o, i, l), r.__e = r.__ = null, i.__e != s && Sn(i)));
  Lt.__r = 0;
}
function wn(t, e, i, r, s, o, l, a, u, d, h) {
  var c, p, f, y, v, O, C, w = r && r.__k || xn, b = e.length;
  for (u = ar(i, e, w, u, b), c = 0; c < b; c++) (f = i.__k[c]) != null && (p = f.__i == -1 ? pt : w[f.__i] || pt, f.__i = c, O = pi(t, f, p, s, o, l, a, u, d, h), y = f.__e, f.ref && p.ref != f.ref && (p.ref && fi(p.ref, null, f), h.push(f.ref, f.__c || y, f)), v == null && y != null && (v = y), (C = !!(4 & f.__u)) || p.__k === f.__k ? u = En(f, u, t, C) : typeof f.type == "function" && O !== void 0 ? u = O : y && (u = y.nextSibling), f.__u &= -7);
  return i.__e = v, u;
}
function ar(t, e, i, r, s) {
  var o, l, a, u, d, h = i.length, c = h, p = 0;
  for (t.__k = new Array(s), o = 0; o < s; o++) (l = e[o]) != null && typeof l != "boolean" && typeof l != "function" ? (typeof l == "string" || typeof l == "number" || typeof l == "bigint" || l.constructor == String ? l = t.__k[o] = At(null, l, null, null, null) : gt(l) ? l = t.__k[o] = At(Y, { children: l }, null, null, null) : l.constructor === void 0 && l.__b > 0 ? l = t.__k[o] = At(l.type, l.props, l.key, l.ref ? l.ref : null, l.__v) : t.__k[o] = l, u = o + p, l.__ = t, l.__b = t.__b + 1, a = null, (d = l.__i = lr(l, i, u, c)) != -1 && (c--, (a = i[d]) && (a.__u |= 2)), a == null || a.__v == null ? (d == -1 && (s > h ? p-- : s < h && p++), typeof l.type != "function" && (l.__u |= 4)) : d != u && (d == u - 1 ? p-- : d == u + 1 ? p++ : (d > u ? p-- : p++, l.__u |= 4))) : t.__k[o] = null;
  if (c) for (o = 0; o < h; o++) (a = i[o]) != null && (2 & a.__u) == 0 && (a.__e == r && (r = rt(a)), In(a, a));
  return r;
}
function En(t, e, i, r) {
  var s, o;
  if (typeof t.type == "function") {
    for (s = t.__k, o = 0; s && o < s.length; o++) s[o] && (s[o].__ = t, e = En(s[o], e, i, r));
    return e;
  }
  t.__e != e && (r && (e && t.type && !e.parentNode && (e = rt(t)), i.insertBefore(t.__e, e || null)), e = t.__e);
  do
    e = e && e.nextSibling;
  while (e != null && e.nodeType == 8);
  return e;
}
function zt(t, e) {
  return e = e || [], t == null || typeof t == "boolean" || (gt(t) ? t.some(function(i) {
    zt(i, e);
  }) : e.push(t)), e;
}
function lr(t, e, i, r) {
  var s, o, l, a = t.key, u = t.type, d = e[i], h = d != null && (2 & d.__u) == 0;
  if (d === null && a == null || h && a == d.key && u == d.type) return i;
  if (r > (h ? 1 : 0)) {
    for (s = i - 1, o = i + 1; s >= 0 || o < e.length; ) if ((d = e[l = s >= 0 ? s-- : o++]) != null && (2 & d.__u) == 0 && a == d.key && u == d.type) return l;
  }
  return -1;
}
function Oi(t, e, i) {
  e[0] == "-" ? t.setProperty(e, i ?? "") : t[e] = i == null ? "" : typeof i != "number" || or.test(e) ? i : i + "px";
}
function vt(t, e, i, r, s) {
  var o, l;
  e: if (e == "style") if (typeof i == "string") t.style.cssText = i;
  else {
    if (typeof r == "string" && (t.style.cssText = r = ""), r) for (e in r) i && e in i || Oi(t.style, e, "");
    if (i) for (e in i) r && i[e] == r[e] || Oi(t.style, e, i[e]);
  }
  else if (e[0] == "o" && e[1] == "n") o = e != (e = e.replace(bn, "$1")), l = e.toLowerCase(), e = l in t || e == "onFocusOut" || e == "onFocusIn" ? l.slice(2) : e.slice(2), t.l || (t.l = {}), t.l[e + o] = i, i ? r ? i.u = r.u : (i.u = ui, t.addEventListener(e, o ? Jt : Xt, o)) : t.removeEventListener(e, o ? Jt : Xt, o);
  else {
    if (s == "http://www.w3.org/2000/svg") e = e.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if (e != "width" && e != "height" && e != "href" && e != "list" && e != "form" && e != "tabIndex" && e != "download" && e != "rowSpan" && e != "colSpan" && e != "role" && e != "popover" && e in t) try {
      t[e] = i ?? "";
      break e;
    } catch {
    }
    typeof i == "function" || (i == null || i === !1 && e[4] != "-" ? t.removeAttribute(e) : t.setAttribute(e, e == "popover" && i == 1 ? "" : i));
  }
}
function Ai(t) {
  return function(e) {
    if (this.l) {
      var i = this.l[e.type + t];
      if (e.t == null) e.t = ui++;
      else if (e.t < i.u) return;
      return i(M.event ? M.event(e) : e);
    }
  };
}
function pi(t, e, i, r, s, o, l, a, u, d) {
  var h, c, p, f, y, v, O, C, w, b, E, k, z, W, D, V, K, U = e.type;
  if (e.constructor !== void 0) return null;
  128 & i.__u && (u = !!(32 & i.__u), o = [a = e.__e = i.__e]), (h = M.__b) && h(e);
  e: if (typeof U == "function") try {
    if (C = e.props, w = "prototype" in U && U.prototype.render, b = (h = U.contextType) && r[h.__c], E = h ? b ? b.props.value : h.__ : r, i.__c ? O = (c = e.__c = i.__c).__ = c.__E : (w ? e.__c = c = new U(C, E) : (e.__c = c = new We(C, E), c.constructor = U, c.render = dr), b && b.sub(c), c.state || (c.state = {}), c.__n = r, p = c.__d = !0, c.__h = [], c._sb = []), w && c.__s == null && (c.__s = c.state), w && U.getDerivedStateFromProps != null && (c.__s == c.state && (c.__s = Be({}, c.__s)), Be(c.__s, U.getDerivedStateFromProps(C, c.__s))), f = c.props, y = c.state, c.__v = e, p) w && U.getDerivedStateFromProps == null && c.componentWillMount != null && c.componentWillMount(), w && c.componentDidMount != null && c.__h.push(c.componentDidMount);
    else {
      if (w && U.getDerivedStateFromProps == null && C !== f && c.componentWillReceiveProps != null && c.componentWillReceiveProps(C, E), e.__v == i.__v || !c.__e && c.shouldComponentUpdate != null && c.shouldComponentUpdate(C, c.__s, E) === !1) {
        for (e.__v != i.__v && (c.props = C, c.state = c.__s, c.__d = !1), e.__e = i.__e, e.__k = i.__k, e.__k.some(function(Z) {
          Z && (Z.__ = e);
        }), k = 0; k < c._sb.length; k++) c.__h.push(c._sb[k]);
        c._sb = [], c.__h.length && l.push(c);
        break e;
      }
      c.componentWillUpdate != null && c.componentWillUpdate(C, c.__s, E), w && c.componentDidUpdate != null && c.__h.push(function() {
        c.componentDidUpdate(f, y, v);
      });
    }
    if (c.context = E, c.props = C, c.__P = t, c.__e = !1, z = M.__r, W = 0, w) {
      for (c.state = c.__s, c.__d = !1, z && z(e), h = c.render(c.props, c.state, c.context), D = 0; D < c._sb.length; D++) c.__h.push(c._sb[D]);
      c._sb = [];
    } else do
      c.__d = !1, z && z(e), h = c.render(c.props, c.state, c.context), c.state = c.__s;
    while (c.__d && ++W < 25);
    c.state = c.__s, c.getChildContext != null && (r = Be(Be({}, r), c.getChildContext())), w && !p && c.getSnapshotBeforeUpdate != null && (v = c.getSnapshotBeforeUpdate(f, y)), V = h, h != null && h.type === Y && h.key == null && (V = kn(h.props.children)), a = wn(t, gt(V) ? V : [V], e, i, r, s, o, l, a, u, d), c.base = e.__e, e.__u &= -161, c.__h.length && l.push(c), O && (c.__E = c.__ = null);
  } catch (Z) {
    if (e.__v = null, u || o != null) if (Z.then) {
      for (e.__u |= u ? 160 : 128; a && a.nodeType == 8 && a.nextSibling; ) a = a.nextSibling;
      o[o.indexOf(a)] = null, e.__e = a;
    } else {
      for (K = o.length; K--; ) hi(o[K]);
      ti(e);
    }
    else e.__e = i.__e, e.__k = i.__k, Z.then || ti(e);
    M.__e(Z, e, i);
  }
  else o == null && e.__v == i.__v ? (e.__k = i.__k, e.__e = i.__e) : a = e.__e = cr(i.__e, e, i, r, s, o, l, u, d);
  return (h = M.diffed) && h(e), 128 & e.__u ? void 0 : a;
}
function ti(t) {
  t && t.__c && (t.__c.__e = !0), t && t.__k && t.__k.forEach(ti);
}
function Cn(t, e, i) {
  for (var r = 0; r < i.length; r++) fi(i[r], i[++r], i[++r]);
  M.__c && M.__c(e, t), t.some(function(s) {
    try {
      t = s.__h, s.__h = [], t.some(function(o) {
        o.call(s);
      });
    } catch (o) {
      M.__e(o, s.__v);
    }
  });
}
function kn(t) {
  return typeof t != "object" || t == null || t.__b && t.__b > 0 ? t : gt(t) ? t.map(kn) : Be({}, t);
}
function cr(t, e, i, r, s, o, l, a, u) {
  var d, h, c, p, f, y, v, O = i.props || pt, C = e.props, w = e.type;
  if (w == "svg" ? s = "http://www.w3.org/2000/svg" : w == "math" ? s = "http://www.w3.org/1998/Math/MathML" : s || (s = "http://www.w3.org/1999/xhtml"), o != null) {
    for (d = 0; d < o.length; d++) if ((f = o[d]) && "setAttribute" in f == !!w && (w ? f.localName == w : f.nodeType == 3)) {
      t = f, o[d] = null;
      break;
    }
  }
  if (t == null) {
    if (w == null) return document.createTextNode(C);
    t = document.createElementNS(s, w, C.is && C), a && (M.__m && M.__m(e, o), a = !1), o = null;
  }
  if (w == null) O === C || a && t.data == C || (t.data = C);
  else {
    if (o = o && Mt.call(t.childNodes), !a && o != null) for (O = {}, d = 0; d < t.attributes.length; d++) O[(f = t.attributes[d]).name] = f.value;
    for (d in O) if (f = O[d], d != "children") {
      if (d == "dangerouslySetInnerHTML") c = f;
      else if (!(d in C)) {
        if (d == "value" && "defaultValue" in C || d == "checked" && "defaultChecked" in C) continue;
        vt(t, d, null, f, s);
      }
    }
    for (d in C) f = C[d], d == "children" ? p = f : d == "dangerouslySetInnerHTML" ? h = f : d == "value" ? y = f : d == "checked" ? v = f : a && typeof f != "function" || O[d] === f || vt(t, d, f, O[d], s);
    if (h) a || c && (h.__html == c.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), e.__k = [];
    else if (c && (t.innerHTML = ""), wn(e.type == "template" ? t.content : t, gt(p) ? p : [p], e, i, r, w == "foreignObject" ? "http://www.w3.org/1999/xhtml" : s, o, l, o ? o[0] : i.__k && rt(i, 0), a, u), o != null) for (d = o.length; d--; ) hi(o[d]);
    a || (d = "value", w == "progress" && y == null ? t.removeAttribute("value") : y != null && (y !== t[d] || w == "progress" && !y || w == "option" && y != O[d]) && vt(t, d, y, O[d], s), d = "checked", v != null && v != t[d] && vt(t, d, v, O[d], s));
  }
  return t;
}
function fi(t, e, i) {
  try {
    if (typeof t == "function") {
      var r = typeof t.__u == "function";
      r && t.__u(), r && e == null || (t.__u = t(e));
    } else t.current = e;
  } catch (s) {
    M.__e(s, i);
  }
}
function In(t, e, i) {
  var r, s;
  if (M.unmount && M.unmount(t), (r = t.ref) && (r.current && r.current != t.__e || fi(r, null, e)), (r = t.__c) != null) {
    if (r.componentWillUnmount) try {
      r.componentWillUnmount();
    } catch (o) {
      M.__e(o, e);
    }
    r.base = r.__P = null;
  }
  if (r = t.__k) for (s = 0; s < r.length; s++) r[s] && In(r[s], e, i || typeof t.type != "function");
  i || hi(t.__e), t.__c = t.__ = t.__e = void 0;
}
function dr(t, e, i) {
  return this.constructor(t, i);
}
function He(t, e, i) {
  var r, s, o, l;
  e == document && (e = document.documentElement), M.__ && M.__(t, e), s = (r = !1) ? null : e.__k, o = [], l = [], pi(e, t = e.__k = Zt(Y, null, [t]), s || pt, pt, e.namespaceURI, s ? null : e.firstChild ? Mt.call(e.childNodes) : null, o, s ? s.__e : e.firstChild, r, l), Cn(o, t, l);
}
function mi(t) {
  function e(i) {
    var r, s;
    return this.getChildContext || (r = /* @__PURE__ */ new Set(), (s = {})[e.__c] = this, this.getChildContext = function() {
      return s;
    }, this.componentWillUnmount = function() {
      r = null;
    }, this.shouldComponentUpdate = function(o) {
      this.props.value != o.value && r.forEach(function(l) {
        l.__e = !0, ei(l);
      });
    }, this.sub = function(o) {
      r.add(o);
      var l = o.componentWillUnmount;
      o.componentWillUnmount = function() {
        r && r.delete(o), l && l.call(o);
      };
    }), i.children;
  }
  return e.__c = "__cC" + vn++, e.__ = t, e.Provider = e.__l = (e.Consumer = function(i, r) {
    return i.children(r);
  }).contextType = e, e;
}
Mt = xn.slice, M = { __e: function(t, e, i, r) {
  for (var s, o, l; e = e.__; ) if ((s = e.__c) && !s.__) try {
    if ((o = s.constructor) && o.getDerivedStateFromError != null && (s.setState(o.getDerivedStateFromError(t)), l = s.__d), s.componentDidCatch != null && (s.componentDidCatch(t, r || {}), l = s.__d), l) return s.__E = s;
  } catch (a) {
    t = a;
  }
  throw t;
} }, gn = 0, We.prototype.setState = function(t, e) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = Be({}, this.state), typeof t == "function" && (t = t(Be({}, i), this.props)), t && Be(i, t), t != null && this.__v && (e && this._sb.push(e), ei(this));
}, We.prototype.forceUpdate = function(t) {
  this.__v && (this.__e = !0, t && this.__h.push(t), ei(this));
}, We.prototype.render = Y, Ye = [], yn = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, _n = function(t, e) {
  return t.__v.__b - e.__v.__b;
}, Lt.__r = 0, bn = /(PointerCapture)$|Capture$/i, ui = 0, Xt = Ai(!1), Jt = Ai(!0), vn = 0;
var ur = 0;
function n(t, e, i, r, s, o) {
  e || (e = {});
  var l, a, u = e;
  if ("ref" in u) for (a in u = {}, e) a == "ref" ? l = e[a] : u[a] = e[a];
  var d = { type: t, props: u, key: i, ref: l, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --ur, __i: -1, __u: 0, __source: s, __self: o };
  if (typeof t == "function" && (l = t.defaultProps)) for (a in l) u[a] === void 0 && (u[a] = l[a]);
  return M.vnode && M.vnode(d), d;
}
const g = {
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
function hr({ guide: t, top: e, left: i, arrowStyle: r, onDismiss: s }) {
  return /* @__PURE__ */ n(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": t.id,
      style: {
        position: "absolute",
        background: g.bg,
        border: `2px solid ${g.primary}`,
        borderRadius: g.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: g.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: g.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: g.text,
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
            onClick: s,
            style: {
              background: g.primary,
              color: g.bg,
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
var Ze, ee, Gt, Pi, ft = 0, Tn = [], re = M, Fi = re.__b, Li = re.__r, zi = re.diffed, Di = re.__c, Ni = re.unmount, Mi = re.__;
function yt(t, e) {
  re.__h && re.__h(ee, t, ft || e), ft = 0;
  var i = ee.__H || (ee.__H = { __: [], __h: [] });
  return t >= i.__.length && i.__.push({}), i.__[t];
}
function x(t) {
  return ft = 1, pr(Rn, t);
}
function pr(t, e, i) {
  var r = yt(Ze++, 2);
  if (r.t = t, !r.__c && (r.__ = [i ? i(e) : Rn(void 0, e), function(a) {
    var u = r.__N ? r.__N[0] : r.__[0], d = r.t(u, a);
    u !== d && (r.__N = [d, r.__[1]], r.__c.setState({}));
  }], r.__c = ee, !ee.__f)) {
    var s = function(a, u, d) {
      if (!r.__c.__H) return !0;
      var h = r.__c.__H.__.filter(function(p) {
        return !!p.__c;
      });
      if (h.every(function(p) {
        return !p.__N;
      })) return !o || o.call(this, a, u, d);
      var c = r.__c.props !== a;
      return h.forEach(function(p) {
        if (p.__N) {
          var f = p.__[0];
          p.__ = p.__N, p.__N = void 0, f !== p.__[0] && (c = !0);
        }
      }), o && o.call(this, a, u, d) || c;
    };
    ee.__f = !0;
    var o = ee.shouldComponentUpdate, l = ee.componentWillUpdate;
    ee.componentWillUpdate = function(a, u, d) {
      if (this.__e) {
        var h = o;
        o = void 0, s(a, u, d), o = h;
      }
      l && l.call(this, a, u, d);
    }, ee.shouldComponentUpdate = s;
  }
  return r.__N || r.__;
}
function ce(t, e) {
  var i = yt(Ze++, 3);
  !re.__s && yi(i.__H, e) && (i.__ = t, i.u = e, ee.__H.__h.push(i));
}
function fr(t, e) {
  var i = yt(Ze++, 4);
  !re.__s && yi(i.__H, e) && (i.__ = t, i.u = e, ee.__h.push(i));
}
function mr(t) {
  return ft = 5, Me(function() {
    return { current: t };
  }, []);
}
function Me(t, e) {
  var i = yt(Ze++, 7);
  return yi(i.__H, e) && (i.__ = t(), i.__H = e, i.__h = t), i.__;
}
function Pe(t, e) {
  return ft = 8, Me(function() {
    return t;
  }, e);
}
function gi(t) {
  var e = ee.context[t.__c], i = yt(Ze++, 9);
  return i.c = t, e ? (i.__ == null && (i.__ = !0, e.sub(ee)), e.props.value) : t.__;
}
function gr() {
  for (var t; t = Tn.shift(); ) if (t.__P && t.__H) try {
    t.__H.__h.forEach(Pt), t.__H.__h.forEach(ii), t.__H.__h = [];
  } catch (e) {
    t.__H.__h = [], re.__e(e, t.__v);
  }
}
re.__b = function(t) {
  ee = null, Fi && Fi(t);
}, re.__ = function(t, e) {
  t && e.__k && e.__k.__m && (t.__m = e.__k.__m), Mi && Mi(t, e);
}, re.__r = function(t) {
  Li && Li(t), Ze = 0;
  var e = (ee = t.__c).__H;
  e && (Gt === ee ? (e.__h = [], ee.__h = [], e.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (e.__h.forEach(Pt), e.__h.forEach(ii), e.__h = [], Ze = 0)), Gt = ee;
}, re.diffed = function(t) {
  zi && zi(t);
  var e = t.__c;
  e && e.__H && (e.__H.__h.length && (Tn.push(e) !== 1 && Pi === re.requestAnimationFrame || ((Pi = re.requestAnimationFrame) || yr)(gr)), e.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), Gt = ee = null;
}, re.__c = function(t, e) {
  e.some(function(i) {
    try {
      i.__h.forEach(Pt), i.__h = i.__h.filter(function(r) {
        return !r.__ || ii(r);
      });
    } catch (r) {
      e.some(function(s) {
        s.__h && (s.__h = []);
      }), e = [], re.__e(r, i.__v);
    }
  }), Di && Di(t, e);
}, re.unmount = function(t) {
  Ni && Ni(t);
  var e, i = t.__c;
  i && i.__H && (i.__H.__.forEach(function(r) {
    try {
      Pt(r);
    } catch (s) {
      e = s;
    }
  }), i.__H = void 0, e && re.__e(e, i.__v));
};
var Ui = typeof requestAnimationFrame == "function";
function yr(t) {
  var e, i = function() {
    clearTimeout(r), Ui && cancelAnimationFrame(e), setTimeout(t);
  }, r = setTimeout(i, 35);
  Ui && (e = requestAnimationFrame(i));
}
function Pt(t) {
  var e = ee, i = t.__c;
  typeof i == "function" && (t.__c = void 0, i()), ee = e;
}
function ii(t) {
  var e = ee;
  t.__c = t.__(), ee = e;
}
function yi(t, e) {
  return !t || t.length !== e.length || e.some(function(i, r) {
    return i !== t[r];
  });
}
function Rn(t, e) {
  return typeof e == "function" ? e(t) : e;
}
function Ut({ block: t, onNext: e, onBack: i, onDismiss: r, onAction: s, isFirstStep: o, isLastStep: l, onPollChange: a, totalPollsInStep: u, surveyMode: d }) {
  const { type: h, settings: c } = t, p = d || (u ?? 1) > 1, [f, y] = x(null), [v, O] = x(""), [C, w] = x(!1), [b, E] = x(null), [k, z] = x(null), [W, D] = x(!1), [V, K] = x(null), [U, Z] = x(!1), [X, we] = x([]), [oe, Fe] = x(!1), [Oe, Le] = x(0), [ue, ve] = x(0), [he, Ue] = x(!1), [xe, ze] = x(""), [ae, $e] = x(!1), [ge, Ae] = x(c.min ?? 0), [Ee, Ce] = x(!1), [I, P] = x(c.choices || []), [J, me] = x(!1), [j, De] = x({}), [le, Ve] = x(!1), S = { fontFamily: g.fontFamily };
  switch (h) {
    case "text":
      const te = c.themeStyle === "title";
      return /* @__PURE__ */ n("div", { style: {
        ...S,
        fontSize: te ? "22px" : "15px",
        fontWeight: te ? 700 : 400,
        color: te ? g.text : g.textMuted,
        lineHeight: 1.4,
        margin: te ? "0 0 12px 0" : "0 0 8px 0",
        textAlign: "center"
      }, children: c.content });
    case "poll-scale": {
      const G = c.minValue ?? 1, L = c.maxValue ?? 5, T = Array.from({ length: L - G + 1 }, (F, ye) => G + ye);
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "18px", fontWeight: 700, textAlign: "center", margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px" }, children: T.map((F) => /* @__PURE__ */ n("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }, children: [
          /* @__PURE__ */ n(
            "button",
            {
              onClick: () => {
                y(F), d && a?.(t.id, t.type, c.question || "", String(F));
              },
              style: {
                width: "100%",
                aspectRatio: "1/1",
                maxWidth: "50px",
                borderRadius: "12px",
                border: `1.5px solid ${f === F ? g.primary : "#E2E8F0"}`,
                backgroundColor: f === F ? `${g.primary}15` : "#F8FAFC",
                color: f === F ? g.primary : "#64748B",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              children: F
            }
          ),
          c.showLabels && c.labels?.[F] && /* @__PURE__ */ n("span", { style: { fontSize: "10px", fontWeight: 600, color: f === F ? g.primary : "#94a3b8", textAlign: "center" }, children: c.labels[F] })
        ] }, F)) }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: f === null || C,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", String(f)), w(!0), p || setTimeout(() => e(), 600);
            },
            style: {
              backgroundColor: C ? "#16a34a" : f === null ? "#94a3b8" : "#222",
              color: "#fff",
              padding: "12px 40px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: f === null || C ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "background-color 0.2s"
            },
            children: C ? "✓ Submitted" : c.submitLabel || "Submit"
          }
        ) })
      ] });
    }
    case "poll-text":
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "20px", padding: "12px 0" }, children: [
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
            value: v,
            placeholder: c.placeholder || "Enter text here...",
            onInput: (G) => {
              const L = G.target.value;
              O(L), d && a?.(t.id, t.type, c.question || "", L.trim());
            },
            style: {
              ...S,
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
            disabled: !v.trim() || C,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", v.trim()), w(!0), p || setTimeout(() => e(), 600);
            },
            style: {
              backgroundColor: C ? "#16a34a" : v.trim() ? "#222222" : "#94a3b8",
              color: "#fff",
              padding: "12px 40px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !v.trim() || C ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "background-color 0.2s"
            },
            children: C ? "✓ Submitted" : c.submitLabel || "Submit"
          }
        ) })
      ] });
    case "poll-yes-no":
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "20px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "18px", fontWeight: 700, textAlign: "center", margin: 0, color: "#222222", lineHeight: 1.2 }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center", gap: "12px" }, children: ["yes", "no"].map((G) => {
          const L = b === G;
          return /* @__PURE__ */ n(
            "button",
            {
              disabled: b !== null,
              onClick: () => {
                a?.(t.id, t.type, c.question || "", G), E(G), !d && !p && setTimeout(() => e(), 400);
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
                cursor: b !== null ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                opacity: b !== null && b !== G ? 0.4 : 1,
                transition: "background-color 0.2s, opacity 0.2s"
              },
              children: L ? `✓ ${G === "yes" ? c.yesLabel || "Yes" : c.noLabel || "No"}` : G === "yes" ? c.yesLabel || "Yes" : c.noLabel || "No"
            },
            G
          );
        }) })
      ] });
    case "poll-nps": {
      const G = Array.from({ length: 11 }, (T, F) => F), L = (T) => {
        z(T), a?.(t.id, t.type, c.question || "", String(T)), d || D(!0);
      };
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, textAlign: "center", margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }, children: G.map((T) => /* @__PURE__ */ n(
          "button",
          {
            disabled: W,
            onClick: () => L(T),
            style: {
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1.5px solid",
              borderColor: k === T ? g.primary : T <= 6 ? "#fca5a5" : T <= 8 ? "#fde68a" : "#86efac",
              backgroundColor: k === T ? g.primary : T <= 6 ? "#fff1f2" : T <= 8 ? "#fefce8" : "#f0fdf4",
              color: k === T ? "#fff" : T <= 6 ? "#dc2626" : T <= 8 ? "#ca8a04" : "#16a34a",
              fontSize: "13px",
              fontWeight: 700,
              cursor: W ? "not-allowed" : "pointer",
              transition: "all 0.15s"
            },
            children: T
          },
          T
        )) }),
        /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", padding: "0 2px" }, children: [
          /* @__PURE__ */ n("span", { style: { fontSize: "11px", color: "#94a3b8" }, children: c.lowLabel || "Not at all likely" }),
          /* @__PURE__ */ n("span", { style: { fontSize: "11px", color: "#94a3b8" }, children: c.highLabel || "Extremely likely" })
        ] })
      ] });
    }
    case "poll-multiple-choice": {
      const G = c.choices || ["Option 1", "Option 2", "Option 3"];
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [
          G.map((L) => {
            const T = V === L;
            return /* @__PURE__ */ n(
              "button",
              {
                disabled: U,
                onClick: () => {
                  K(L), d && a?.(t.id, t.type, c.question || "", L);
                },
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: `1.5px solid ${T ? g.primary : "#E2E8F0"}`,
                  backgroundColor: T ? `${g.primary}10` : "#F8FAFC",
                  cursor: U ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  fontFamily: g.fontFamily
                },
                children: [
                  /* @__PURE__ */ n("div", { style: {
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `2px solid ${T ? g.primary : "#cbd5e1"}`,
                    backgroundColor: T ? g.primary : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }, children: T && /* @__PURE__ */ n("div", { style: { width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#fff" } }) }),
                  /* @__PURE__ */ n("span", { style: { fontSize: "14px", fontWeight: 500, color: T ? g.primary : "#334155" }, children: L })
                ]
              },
              L
            );
          }),
          c.allowOther && /* @__PURE__ */ n("button", { disabled: !0, style: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #E2E8F0", backgroundColor: "#F8FAFC", textAlign: "left", fontFamily: g.fontFamily }, children: [
            /* @__PURE__ */ n("div", { style: { width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #cbd5e1", flexShrink: 0 } }),
            /* @__PURE__ */ n("span", { style: { fontSize: "14px", fontWeight: 500, color: "#94a3b8" }, children: "Other…" })
          ] })
        ] }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: !V || U,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", V), Z(!0);
            },
            style: {
              backgroundColor: U ? "#16a34a" : V ? "#222" : "#94a3b8",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !V || U ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: U ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-checkboxes": {
      const G = c.choices || ["Option 1", "Option 2", "Option 3"], L = (T) => {
        const F = X.includes(T) ? X.filter((ye) => ye !== T) : [...X, T];
        we(F), d && a?.(t.id, t.type, c.question || "", F.join(", "));
      };
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: G.map((T) => {
          const F = X.includes(T);
          return /* @__PURE__ */ n(
            "button",
            {
              disabled: oe,
              onClick: () => L(T),
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: `1.5px solid ${F ? g.primary : "#E2E8F0"}`,
                backgroundColor: F ? `${g.primary}10` : "#F8FAFC",
                cursor: oe ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                fontFamily: g.fontFamily
              },
              children: [
                /* @__PURE__ */ n("div", { style: {
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  flexShrink: 0,
                  border: `2px solid ${F ? g.primary : "#cbd5e1"}`,
                  backgroundColor: F ? g.primary : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }, children: F && /* @__PURE__ */ n("span", { style: { color: "#fff", fontSize: "11px", fontWeight: 700, lineHeight: 1 }, children: "✓" }) }),
                /* @__PURE__ */ n("span", { style: { fontSize: "14px", fontWeight: 500, color: F ? g.primary : "#334155" }, children: T })
              ]
            },
            T
          );
        }) }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: X.length === 0 || oe,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", X.join(", ")), Fe(!0);
            },
            style: {
              backgroundColor: oe ? "#16a34a" : X.length === 0 ? "#94a3b8" : "#222",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: X.length === 0 || oe ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: oe ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-star-rating": {
      const G = c.maxStars ?? 5;
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, textAlign: "center", margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center", gap: "6px" }, children: Array.from({ length: G }, (L, T) => T + 1).map((L) => {
          const T = L <= (Oe || ue);
          return /* @__PURE__ */ n(
            "button",
            {
              disabled: he,
              onClick: () => {
                ve(L), d && a?.(t.id, t.type, c.question || "", String(L));
              },
              onMouseEnter: () => !he && Le(L),
              onMouseLeave: () => Le(0),
              style: {
                background: "none",
                border: "none",
                cursor: he ? "not-allowed" : "pointer",
                padding: "2px",
                fontSize: "28px",
                transition: "transform 0.1s",
                transform: L <= Oe ? "scale(1.15)" : "scale(1)"
              },
              children: /* @__PURE__ */ n("span", { style: { color: T ? "#f59e0b" : "#d1d5db" }, children: "★" })
            },
            L
          );
        }) }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: ue === 0 || he,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", String(ue)), Ue(!0);
            },
            style: {
              backgroundColor: he ? "#16a34a" : ue === 0 ? "#94a3b8" : "#222",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: ue === 0 || he ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: he ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-dropdown": {
      const G = c.choices || ["Option 1", "Option 2", "Option 3"];
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n(
          "select",
          {
            value: xe,
            disabled: ae,
            onChange: (L) => {
              const T = L.target.value;
              ze(T), d && a?.(t.id, t.type, c.question || "", T);
            },
            style: {
              ...S,
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1.5px solid ${xe ? g.primary : "#E2E8F0"}`,
              backgroundColor: "#F8FAFC",
              fontSize: "14px",
              color: xe ? "#1e293b" : "#94a3b8",
              cursor: ae ? "not-allowed" : "pointer",
              outline: "none"
            },
            children: [
              /* @__PURE__ */ n("option", { value: "", disabled: !0, children: "Select an option…" }),
              G.map((L) => /* @__PURE__ */ n("option", { value: L, children: L }, L))
            ]
          }
        ),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: !xe || ae,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", xe), $e(!0);
            },
            style: {
              backgroundColor: ae ? "#16a34a" : xe ? "#222" : "#94a3b8",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !xe || ae ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: ae ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-slider": {
      const G = c.min ?? 0, L = c.max ?? 10, T = c.step ?? 1, F = (ge - G) / (L - G) * 100;
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, textAlign: "center", margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { padding: "8px 4px" }, children: [
          /* @__PURE__ */ n("div", { style: { position: "relative", height: "6px", borderRadius: "3px", backgroundColor: "#E2E8F0", margin: "8px 0" }, children: /* @__PURE__ */ n("div", { style: { position: "absolute", left: 0, top: 0, height: "100%", width: `${F}%`, borderRadius: "3px", backgroundColor: g.primary } }) }),
          /* @__PURE__ */ n(
            "input",
            {
              type: "range",
              min: G,
              max: L,
              step: T,
              value: ge,
              disabled: Ee,
              onInput: (ye) => {
                const _ = Number(ye.target.value);
                Ae(_), d && a?.(t.id, t.type, c.question || "", String(_));
              },
              style: { width: "100%", accentColor: g.primary, cursor: Ee ? "not-allowed" : "pointer" }
            }
          ),
          /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ n("span", { style: { fontSize: "11px", color: "#94a3b8" }, children: c.minLabel || G }),
            /* @__PURE__ */ n("span", { style: { fontSize: "13px", fontWeight: 700, color: g.primary }, children: ge }),
            /* @__PURE__ */ n("span", { style: { fontSize: "11px", color: "#94a3b8" }, children: c.maxLabel || L })
          ] })
        ] }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: Ee,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", String(ge)), Ce(!0);
            },
            style: {
              backgroundColor: Ee ? "#16a34a" : "#222",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: Ee ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: Ee ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-ranking": {
      const G = (L, T) => {
        const F = [...I], ye = L + T;
        ye < 0 || ye >= F.length || ([F[L], F[ye]] = [F[ye], F[L]], P(F), d && a?.(t.id, t.type, c.question || "", F.join(", ")));
      };
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "6px" }, children: I.map((L, T) => /* @__PURE__ */ n("div", { style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          borderRadius: "10px",
          border: "1.5px solid #E2E8F0",
          backgroundColor: "#F8FAFC"
        }, children: [
          /* @__PURE__ */ n("span", { style: { fontSize: "12px", fontWeight: 700, color: "#94a3b8", width: "18px" }, children: T + 1 }),
          /* @__PURE__ */ n("span", { style: { flex: 1, fontSize: "14px", fontWeight: 500, color: "#334155" }, children: L }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "2px" }, children: [
            /* @__PURE__ */ n("button", { onClick: () => G(T, -1), disabled: T === 0 || J, style: { background: "none", border: "none", cursor: T === 0 ? "not-allowed" : "pointer", opacity: T === 0 ? 0.3 : 1, padding: "1px 4px", fontSize: "10px", color: "#64748b" }, children: "▲" }),
            /* @__PURE__ */ n("button", { onClick: () => G(T, 1), disabled: T === I.length - 1 || J, style: { background: "none", border: "none", cursor: T === I.length - 1 ? "not-allowed" : "pointer", opacity: T === I.length - 1 ? 0.3 : 1, padding: "1px 4px", fontSize: "10px", color: "#64748b" }, children: "▼" })
          ] })
        ] }, L)) }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: J,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", I.join(", ")), me(!0);
            },
            style: {
              backgroundColor: J ? "#16a34a" : "#222",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: J ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: J ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "poll-matrix": {
      const G = c.rows || ["Item 1", "Item 2", "Item 3"], L = c.columns || ["Poor", "Fair", "Good", "Excellent"], T = G.every((F) => j[F]);
      return /* @__PURE__ */ n("div", { style: { ...S, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0", overflowX: "auto" }, children: [
        c.question && /* @__PURE__ */ n("h3", { style: { fontSize: "16px", fontWeight: 700, margin: 0, color: g.text }, children: c.question }),
        /* @__PURE__ */ n("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" }, children: [
          /* @__PURE__ */ n("thead", { children: /* @__PURE__ */ n("tr", { children: [
            /* @__PURE__ */ n("th", { style: { padding: "6px", textAlign: "left" } }),
            L.map((F) => /* @__PURE__ */ n("th", { style: { padding: "6px 4px", textAlign: "center", fontWeight: 600, color: "#64748b", fontSize: "12px" }, children: F }, F))
          ] }) }),
          /* @__PURE__ */ n("tbody", { children: G.map((F, ye) => /* @__PURE__ */ n("tr", { style: { backgroundColor: ye % 2 === 0 ? "#F8FAFC" : "#fff" }, children: [
            /* @__PURE__ */ n("td", { style: { padding: "8px 6px", fontWeight: 500, color: "#334155" }, children: F }),
            L.map((_) => {
              const A = j[F] === _;
              return /* @__PURE__ */ n("td", { style: { padding: "8px 4px", textAlign: "center" }, children: /* @__PURE__ */ n(
                "button",
                {
                  disabled: le,
                  onClick: () => {
                    const H = { ...j, [F]: _ };
                    De(H), d && a?.(t.id, t.type, c.question || "", JSON.stringify(H));
                  },
                  style: {
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: `2px solid ${A ? g.primary : "#cbd5e1"}`,
                    backgroundColor: A ? g.primary : "transparent",
                    cursor: le ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center"
                  },
                  children: A && /* @__PURE__ */ n("div", { style: { width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#fff" } })
                }
              ) }, _);
            })
          ] }, F)) })
        ] }),
        !d && /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ n(
          "button",
          {
            disabled: !T || le,
            onClick: () => {
              a?.(t.id, t.type, c.question || "", JSON.stringify(j)), Ve(!0);
            },
            style: {
              backgroundColor: le ? "#16a34a" : T ? "#222" : "#94a3b8",
              color: "#fff",
              padding: "10px 36px",
              borderRadius: "10px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !T || le ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            },
            children: le ? "✓ Submitted" : "Submit"
          }
        ) })
      ] });
    }
    case "button":
      const pe = (c.label || "").toLowerCase(), nt = c.action || "next";
      return /* @__PURE__ */ n("div", { style: { display: "flex", gap: "12px", width: "100%", margin: "8px 0" }, children: [
        nt === "next" && !o && /* @__PURE__ */ n(
          "button",
          {
            onClick: i,
            style: {
              flex: 1,
              padding: "12px 24px",
              borderRadius: "10px",
              border: `1.5px solid ${g.border}`,
              backgroundColor: "transparent",
              color: g.text,
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
              nt === "next" ? e() : nt === "dismiss" ? r() : nt === "url" && c.url && s(c.url);
            },
            style: {
              flex: 2,
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: g.primary,
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
      return /* @__PURE__ */ n("hr", { style: { border: "none", borderTop: `1px solid ${g.border}`, margin: "16px 0" } });
    default:
      return null;
  }
}
function _r({
  content: t,
  onDismiss: e,
  onNext: i,
  onBack: r,
  onAction: s,
  isFirstStep: o,
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
    const p = d.layout || {}, f = {
      center: ["center", "center"],
      top: ["flex-start", "center"],
      bottom: ["flex-end", "center"],
      "top-left": ["flex-start", "flex-start"],
      "top-right": ["flex-start", "flex-end"],
      "bottom-left": ["flex-end", "flex-start"],
      "bottom-right": ["flex-end", "flex-end"]
    };
    let y = "center", v = "center";
    if (p.position && f[p.position])
      [y, v] = f[p.position];
    else if (p.verticalAlignment || p.horizontalAlignment) {
      const O = { top: "flex-start", center: "center", bottom: "flex-end" }, C = { left: "flex-start", center: "center", right: "flex-end" };
      y = O[p.verticalAlignment || "center"] ?? "center", v = C[p.horizontalAlignment || "center"] ?? "center";
    }
    return {
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: y,
      justifyContent: v,
      backgroundColor: d.backdropColor || "rgba(0, 0, 0, 0.5)",
      zIndex: g.zIndex.guides,
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
              backgroundColor: g.bg,
              borderRadius: "16px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              fontFamily: g.fontFamily,
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
                const p = d.blocks.filter((f) => f.type.startsWith("poll-")).length;
                return d.blocks.map((f) => /* @__PURE__ */ n(
                  Ut,
                  {
                    block: f,
                    onNext: i,
                    onBack: r,
                    onDismiss: e,
                    onAction: s,
                    isFirstStep: o,
                    isLastStep: l,
                    onPollChange: a,
                    totalPollsInStep: p,
                    surveyMode: u
                  },
                  f.id
                ));
              })() }) : (
                /* Fallback Legacy Rendering */
                /* @__PURE__ */ n("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ n("h2", { style: { margin: "0 0 12px 0", fontSize: "22px", fontWeight: 700, color: g.text }, children: d.title }),
                  d.body && /* @__PURE__ */ n("p", { style: { margin: 0, fontSize: "15px", color: g.textMuted }, children: d.body }),
                  /* @__PURE__ */ n("div", { style: { display: "flex", gap: "12px", marginTop: "24px" }, children: [
                    !o && /* @__PURE__ */ n(
                      "button",
                      {
                        onClick: r,
                        style: {
                          flex: 1,
                          padding: "12px 24px",
                          borderRadius: "10px",
                          border: `1.5px solid ${g.border}`,
                          backgroundColor: "transparent",
                          color: g.text,
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
                          backgroundColor: g.primary,
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
const On = "Template", An = "Description", br = "Next";
function vr(t) {
  try {
    return JSON.parse(t || "{}");
  } catch {
    return { title: On, description: An };
  }
}
const xr = {
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  paddingTop: 24,
  paddingRight: 16,
  paddingBottom: 24,
  paddingLeft: 16,
  fontFamily: g.fontFamily
};
function Sr({
  title: t = On,
  description: e = An,
  buttonContent: i = br,
  onNext: r,
  onBack: s,
  isFirstStep: o = !1
}) {
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: 4, position: "relative" }, children: [
    /* @__PURE__ */ n("h3", { style: { fontSize: 14, fontWeight: 600, color: "#1855BC", lineHeight: 1.3, margin: 0 }, children: t }),
    /* @__PURE__ */ n("p", { style: { fontSize: 11, color: "#6b7280", lineHeight: 1.4, margin: 0 }, children: e }),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: 8, justifyContent: "center", paddingTop: 4 }, children: [
      !o && /* @__PURE__ */ n(
        "button",
        {
          onClick: (l) => {
            l.stopPropagation(), s?.();
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
function wr({ template: t, top: e, left: i, onDismiss: r, onNext: s, onBack: o, isFirstStep: l, isLastStep: a, onPollChange: u, surveyMode: d }) {
  const h = Me(() => vr(ke(t)), [t]), p = t.template.template_key === "tooltip-scratch";
  return /* @__PURE__ */ n(
    "div",
    {
      style: {
        position: "absolute",
        top: `${e}px`,
        left: `${i}px`,
        zIndex: g.zIndex.tooltip,
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
        /* @__PURE__ */ n("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 8, ...xr }, children: [
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
            const f = h.blocks.filter((y) => y.type.startsWith("poll-")).length;
            return h.blocks.map((y) => /* @__PURE__ */ n(
              Ut,
              {
                block: y,
                onNext: s,
                onBack: o,
                onDismiss: r,
                onAction: (v) => window.open(v, "_blank"),
                isFirstStep: l,
                isLastStep: a,
                onPollChange: u,
                totalPollsInStep: f,
                surveyMode: d
              },
              y.id
            ));
          })() }) : /* @__PURE__ */ n(
            Sr,
            {
              title: h.title,
              description: h.description,
              buttonContent: h.buttonContent,
              onNext: s,
              onBack: o,
              isFirstStep: l
            }
          )
        ] })
      ] })
    }
  );
}
function Er({
  content: t,
  onDismiss: e,
  onNext: i,
  onBack: r,
  onAction: s,
  isFirstStep: o,
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
    borderTop: h === "bottom" ? `3px solid ${g.primary}` : "none",
    borderBottom: h === "top" ? `3px solid ${g.primary}` : "none",
    boxShadow: h === "top" ? "0 4px 16px rgba(0,0,0,0.10)" : "0 -4px 16px rgba(0,0,0,0.10)",
    zIndex: g.zIndex.guides,
    fontFamily: g.fontFamily,
    animation: h === "top" ? "banner-slide-down 0.3s ease" : "banner-slide-up 0.3s ease",
    pointerEvents: "auto"
  }, p = d.blocks ?? [], f = p.filter((y) => y.type.startsWith("poll-")).length;
  return /* @__PURE__ */ n(Y, { children: [
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
      p.length > 0 ? p.map((y) => /* @__PURE__ */ n("div", { style: { flex: y.type === "button" ? "0 0 auto" : "1 1 auto", minWidth: 0 }, children: /* @__PURE__ */ n(
        Ut,
        {
          block: y,
          onNext: i,
          onBack: r,
          onDismiss: e,
          onAction: s,
          isFirstStep: o,
          isLastStep: l,
          onPollChange: a,
          totalPollsInStep: f,
          surveyMode: u
        }
      ) }, y.id)) : /* @__PURE__ */ n("span", { style: { fontSize: "14px", color: g.textMuted, fontFamily: g.fontFamily }, children: "Banner — add blocks to show content" }),
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
function Cr({ targetRect: t }) {
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
        zIndex: g.zIndex.overlay,
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
function kr(t) {
  const e = { position: "absolute" };
  switch (t) {
    case "top":
      return { ...e, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${g.primary} transparent transparent transparent` };
    case "bottom":
      return { ...e, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${g.primary} transparent` };
    case "left":
      return { ...e, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${g.primary}` };
    default:
      return { ...e, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${g.primary} transparent transparent` };
  }
}
function Bi(t, e, i, r) {
  const s = t.getBoundingClientRect();
  let o = 0, l = 0;
  switch (e) {
    case "top":
      o = s.top - r - 12, l = s.left + s.width / 2 - i / 2;
      break;
    case "bottom":
      o = s.bottom + 12, l = s.left + s.width / 2 - i / 2;
      break;
    case "left":
      o = s.top + s.height / 2 - r / 2, l = s.left - i - 12;
      break;
    default:
      o = s.top + s.height / 2 - r / 2, l = s.right + 12;
      break;
  }
  const a = window.innerWidth, u = window.innerHeight;
  return l < 10 ? l = 10 : l + i > a - 10 && (l = a - i - 10), o < 10 ? o = 10 : o + r > u - 10 && (o = u - r - 10), { top: o, left: l, arrowStyle: kr(e) };
}
class Ir {
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
  firePollResponse(e, i, r, s) {
    if (!this.triggeredGuide) return;
    if (this.isSurveyMode()) {
      this.surveyPendingAnswers.set(e, { pollType: i, question: r, value: s });
      return;
    }
    const a = [...(this.triggeredGuide.templates || []).filter((u) => u.is_active)].sort((u, d) => u.step_order - d.step_order)[this.currentStepIndex];
    a && this.onPollResponse(this.triggeredGuide, a.template_id, e, i, r, s, this.currentStepIndex);
  }
  flushSurveyAnswers() {
    if (!this.triggeredGuide || this.surveyPendingAnswers.size === 0) return;
    const r = [...(this.triggeredGuide.templates || []).filter((s) => s.is_active)].sort((s, o) => s.step_order - o.step_order)[this.currentStepIndex];
    if (r) {
      for (const [s, { pollType: o, question: l, value: a }] of this.surveyPendingAnswers)
        this.onPollResponse(this.triggeredGuide, r.template_id, s, o, l, a, this.currentStepIndex);
      this.surveyPendingAnswers.clear();
    }
  }
  renderGuides(e) {
    this.lastGuides = e;
    const i = Je(), r = e.filter(
      (c) => c.page === i && c.status === "active" && !this.dismissedThisSession.has(c.id)
    );
    if (this.ensureContainer(), !this.container) return;
    const s = [], o = [];
    for (const c of r) {
      const p = Ne.findElement(c.selector);
      if (!p) continue;
      Wt(p);
      const f = Bi(p, c.placement, 280, 80);
      s.push({ guide: c, target: p, pos: f });
    }
    if (this.triggeredGuide && !this.dismissedThisSession.has(this.triggeredGuide.guide_id)) {
      const f = [...(this.triggeredGuide.templates || []).filter((y) => y.is_active)].sort((y, v) => y.step_order - v.step_order)[this.currentStepIndex];
      if (f && f.x_path) {
        const y = Ne.findElement(f.x_path);
        if (y) {
          Wt(y);
          const v = Bi(y, "bottom", 300, 160), O = y.getBoundingClientRect(), C = O.left + O.width / 2;
          v.left = C - 16 - 16;
          const w = window.innerWidth;
          v.left < 10 ? v.left = 10 : v.left + 300 > w - 10 && (v.left = w - 300 - 10), o.push({ template: f, target: y, pos: v, targetRect: O });
        } else
          console.warn(`[Visual Designer] Target element not found for template "${f.template_id}" using selector: ${f.x_path}`);
      }
    }
    const a = [...(this.triggeredGuide?.templates || []).filter((c) => c.is_active)].sort((c, p) => c.step_order - p.step_order), u = a[this.currentStepIndex], d = !!u && !u.x_path && (() => {
      try {
        return JSON.parse(ke(u)).layout?.renderAs === "banner";
      } catch {
        return !1;
      }
    })(), h = !d && !u?.x_path;
    if (s.length === 0 && o.length === 0 && !u) {
      He(null, this.container);
      return;
    }
    He(
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
            zIndex: g.zIndex.guides,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          },
          children: [
            o.length > 0 && /* @__PURE__ */ n(Cr, { targetRect: o[0].targetRect }),
            s.map(({ guide: c, pos: p }) => /* @__PURE__ */ n(
              hr,
              {
                guide: c,
                top: p.top,
                left: p.left,
                arrowStyle: p.arrowStyle,
                onDismiss: () => this.dismissGuide(c.id)
              },
              c.id
            )),
            o.map(({ template: c, pos: p }) => /* @__PURE__ */ n(
              wr,
              {
                template: c,
                top: p.top,
                left: p.left,
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (f, y, v, O) => this.firePollResponse(f, y, v, O),
                surveyMode: this.isSurveyMode()
              },
              this.triggeredGuide.guide_id
            )),
            d && u && /* @__PURE__ */ n(
              Er,
              {
                content: ke(u),
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                onAction: (c) => window.location.href = c,
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (c, p, f, y) => this.firePollResponse(c, p, f, y),
                surveyMode: this.isSurveyMode()
              },
              `${this.triggeredGuide.guide_id}-${this.currentStepIndex}`
            ),
            h && u && /* @__PURE__ */ n(
              _r,
              {
                content: ke(u),
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                onAction: (c) => window.location.href = c,
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (c, p, f, y) => this.firePollResponse(c, p, f, y),
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
    const s = [...(e.templates || []).filter((o) => o.is_active)].sort((o, l) => o.step_order - l.step_order)[0];
    if (s && s.x_path)
      try {
        await Ne.waitForElement(s.x_path);
      } catch (o) {
        console.warn(`[Visual Designer] Timeout waiting for first step element: ${s.x_path}`, o);
      }
    this.renderGuides(this.lastGuides);
  }
  handleBack() {
    if (!this.triggeredGuide || this.currentStepIndex === 0) return;
    this.surveyPendingAnswers.clear(), this.currentStepIndex--;
    const r = [...(this.triggeredGuide.templates || []).filter((s) => s.is_active)].sort((s, o) => s.step_order - o.step_order)[this.currentStepIndex];
    if (r?.x_path) {
      const s = Ne.findElement(r.x_path);
      s && Wt(s);
    }
    this.renderGuides(this.lastGuides);
  }
  async handleNext() {
    if (!this.triggeredGuide) return;
    this.isSurveyMode() && this.flushSurveyAnswers();
    const i = [...(this.triggeredGuide.templates || []).filter((s) => s.is_active)].sort((s, o) => s.step_order - o.step_order), r = i[this.currentStepIndex];
    if (this.onNext(this.triggeredGuide, this.currentStepIndex, i.length), r && r.auto_click_target && r.x_path) {
      console.log(`[Visual Designer] Auto-clicking target element for step: ${r.template_id}`);
      const s = Ne.findElement(r.x_path);
      s instanceof HTMLElement ? s.click() : s && s.click?.();
    }
    if (this.currentStepIndex < i.length - 1) {
      this.currentStepIndex++;
      const s = i[this.currentStepIndex];
      if (s && s.x_path)
        try {
          this.renderGuides(this.lastGuides), await Ne.waitForElement(s.x_path);
        } catch {
          console.warn(`[Visual Designer] Target element not found for step: ${s.template_id}`);
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
    this.dismissedThisSession.clear(), this.container && He(null, this.container);
  }
  clearTriggeredGuide() {
    this.triggeredGuide = null, this.currentStepIndex = 0, this.container && He(null, this.container);
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
      this.container = document.createElement("div"), this.container.id = "designer-guides-root", this.container.style.position = "fixed", this.container.style.top = "0", this.container.style.left = "0", this.container.style.width = "100vw", this.container.style.height = "100vh", this.container.style.pointerEvents = "none", this.container.style.zIndex = String(g.zIndex.guides), document.body.appendChild(this.container);
    }
  }
}
const Wi = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function Tr({ feature: t, color: e, rect: i }) {
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
        zIndex: g.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${e}`
      }
    }
  );
}
class Rr {
  container = null;
  lastEnabled = !1;
  render(e, i) {
    if (this.lastEnabled = i, this.clear(), !i || e.length === 0) return;
    const r = e.filter((o) => (o.selector || "").trim() !== "");
    if (this.ensureContainer(), !this.container) return;
    const s = r.map((o, l) => {
      const a = Ne.findElement(o.selector);
      if (!a) return null;
      const u = a.getBoundingClientRect(), d = Wi[l % Wi.length];
      return { feature: o, rect: u, color: d };
    }).filter(Boolean);
    s.length !== 0 && He(
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
            zIndex: g.zIndex.overlay - 1
          },
          children: s.map(({ feature: o, rect: l, color: a }) => /* @__PURE__ */ n(
            Tr,
            {
              feature: o,
              color: a,
              rect: {
                left: l.left,
                top: l.top,
                width: l.width,
                height: l.height
              }
            },
            o.id
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
    this.container && He(null, this.container);
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
var st = class {
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
}, Or = {
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
}, Ar = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = Or;
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
}, Xe = new Ar();
function Pr(t) {
  setTimeout(t, 0);
}
var et = typeof window > "u" || "Deno" in globalThis;
function be() {
}
function Fr(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function ni(t) {
  return typeof t == "number" && t >= 0 && t !== 1 / 0;
}
function Pn(t, e) {
  return Math.max(t + (e || 0) - Date.now(), 0);
}
function qe(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function Re(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function Gi(t, e) {
  const {
    type: i = "all",
    exact: r,
    fetchStatus: s,
    predicate: o,
    queryKey: l,
    stale: a
  } = t;
  if (l) {
    if (r) {
      if (e.queryHash !== _i(l, e.options))
        return !1;
    } else if (!mt(e.queryKey, l))
      return !1;
  }
  if (i !== "all") {
    const u = e.isActive();
    if (i === "active" && !u || i === "inactive" && u)
      return !1;
  }
  return !(typeof a == "boolean" && e.isStale() !== a || s && s !== e.state.fetchStatus || o && !o(e));
}
function $i(t, e) {
  const { exact: i, status: r, predicate: s, mutationKey: o } = t;
  if (o) {
    if (!e.options.mutationKey)
      return !1;
    if (i) {
      if (tt(e.options.mutationKey) !== tt(o))
        return !1;
    } else if (!mt(e.options.mutationKey, o))
      return !1;
  }
  return !(r && e.state.status !== r || s && !s(e));
}
function _i(t, e) {
  return (e?.queryKeyHashFn || tt)(t);
}
function tt(t) {
  return JSON.stringify(
    t,
    (e, i) => ri(i) ? Object.keys(i).sort().reduce((r, s) => (r[s] = i[s], r), {}) : i
  );
}
function mt(t, e) {
  return t === e ? !0 : typeof t != typeof e ? !1 : t && e && typeof t == "object" && typeof e == "object" ? Object.keys(e).every((i) => mt(t[i], e[i])) : !1;
}
var Lr = Object.prototype.hasOwnProperty;
function Fn(t, e, i = 0) {
  if (t === e)
    return t;
  if (i > 500) return e;
  const r = Hi(t) && Hi(e);
  if (!r && !(ri(t) && ri(e))) return e;
  const o = (r ? t : Object.keys(t)).length, l = r ? e : Object.keys(e), a = l.length, u = r ? new Array(a) : {};
  let d = 0;
  for (let h = 0; h < a; h++) {
    const c = r ? h : l[h], p = t[c], f = e[c];
    if (p === f) {
      u[c] = p, (r ? h < o : Lr.call(t, c)) && d++;
      continue;
    }
    if (p === null || f === null || typeof p != "object" || typeof f != "object") {
      u[c] = f;
      continue;
    }
    const y = Fn(p, f, i + 1);
    u[c] = y, y === p && d++;
  }
  return o === a && d === o ? t : u;
}
function Dt(t, e) {
  if (!e || Object.keys(t).length !== Object.keys(e).length)
    return !1;
  for (const i in t)
    if (t[i] !== e[i])
      return !1;
  return !0;
}
function Hi(t) {
  return Array.isArray(t) && t.length === Object.keys(t).length;
}
function ri(t) {
  if (!qi(t))
    return !1;
  const e = t.constructor;
  if (e === void 0)
    return !0;
  const i = e.prototype;
  return !(!qi(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(t) !== Object.prototype);
}
function qi(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function zr(t) {
  return new Promise((e) => {
    Xe.setTimeout(e, t);
  });
}
function si(t, e, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(t, e) : i.structuralSharing !== !1 ? Fn(t, e) : e;
}
function Dr(t, e, i = 0) {
  const r = [...t, e];
  return i && r.length > i ? r.slice(1) : r;
}
function Nr(t, e, i = 0) {
  const r = [e, ...t];
  return i && r.length > i ? r.slice(0, -1) : r;
}
var bi = /* @__PURE__ */ Symbol();
function Ln(t, e) {
  return !t.queryFn && e?.initialPromise ? () => e.initialPromise : !t.queryFn || t.queryFn === bi ? () => Promise.reject(new Error(`Missing queryFn: '${t.queryHash}'`)) : t.queryFn;
}
function vi(t, e) {
  return typeof t == "function" ? t(...e) : !!t;
}
function Mr(t, e, i) {
  let r = !1, s;
  return Object.defineProperty(t, "signal", {
    enumerable: !0,
    get: () => (s ??= e(), r || (r = !0, s.aborted ? i() : s.addEventListener("abort", i, { once: !0 })), s)
  }), t;
}
var Ur = class extends st {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!et && window.addEventListener) {
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
}, xi = new Ur();
function oi() {
  let t, e;
  const i = new Promise((s, o) => {
    t = s, e = o;
  });
  i.status = "pending", i.catch(() => {
  });
  function r(s) {
    Object.assign(i, s), delete i.resolve, delete i.reject;
  }
  return i.resolve = (s) => {
    r({
      status: "fulfilled",
      value: s
    }), t(s);
  }, i.reject = (s) => {
    r({
      status: "rejected",
      reason: s
    }), e(s);
  }, i;
}
var Br = Pr;
function Wr() {
  let t = [], e = 0, i = (a) => {
    a();
  }, r = (a) => {
    a();
  }, s = Br;
  const o = (a) => {
    e ? t.push(a) : s(() => {
      i(a);
    });
  }, l = () => {
    const a = t;
    t = [], a.length && s(() => {
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
      o(() => {
        a(...u);
      });
    },
    schedule: o,
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
      s = a;
    }
  };
}
var se = Wr(), Gr = class extends st {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!et && window.addEventListener) {
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
}, Nt = new Gr();
function $r(t) {
  return Math.min(1e3 * 2 ** t, 3e4);
}
function zn(t) {
  return (t ?? "online") === "online" ? Nt.isOnline() : !0;
}
var ai = class extends Error {
  constructor(t) {
    super("CancelledError"), this.revert = t?.revert, this.silent = t?.silent;
  }
};
function Dn(t) {
  let e = !1, i = 0, r;
  const s = oi(), o = () => s.status !== "pending", l = (v) => {
    if (!o()) {
      const O = new ai(v);
      p(O), t.onCancel?.(O);
    }
  }, a = () => {
    e = !0;
  }, u = () => {
    e = !1;
  }, d = () => xi.isFocused() && (t.networkMode === "always" || Nt.isOnline()) && t.canRun(), h = () => zn(t.networkMode) && t.canRun(), c = (v) => {
    o() || (r?.(), s.resolve(v));
  }, p = (v) => {
    o() || (r?.(), s.reject(v));
  }, f = () => new Promise((v) => {
    r = (O) => {
      (o() || d()) && v(O);
    }, t.onPause?.();
  }).then(() => {
    r = void 0, o() || t.onContinue?.();
  }), y = () => {
    if (o())
      return;
    let v;
    const O = i === 0 ? t.initialPromise : void 0;
    try {
      v = O ?? t.fn();
    } catch (C) {
      v = Promise.reject(C);
    }
    Promise.resolve(v).then(c).catch((C) => {
      if (o())
        return;
      const w = t.retry ?? (et ? 0 : 3), b = t.retryDelay ?? $r, E = typeof b == "function" ? b(i, C) : b, k = w === !0 || typeof w == "number" && i < w || typeof w == "function" && w(i, C);
      if (e || !k) {
        p(C);
        return;
      }
      i++, t.onFail?.(i, C), zr(E).then(() => d() ? void 0 : f()).then(() => {
        e ? p(C) : y();
      });
    });
  };
  return {
    promise: s,
    status: () => s.status,
    cancel: l,
    continue: () => (r?.(), s),
    cancelRetry: a,
    continueRetry: u,
    canStart: h,
    start: () => (h() ? y() : f().then(y), s)
  };
}
var Nn = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), ni(this.gcTime) && (this.#e = Xe.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(t) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      t ?? (et ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (Xe.clearTimeout(this.#e), this.#e = void 0);
  }
}, Hr = class extends Nn {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(t) {
    super(), this.#a = !1, this.#o = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.#r = t.client, this.#i = this.#r.getQueryCache(), this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.#e = ji(this.options), this.state = t.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(t) {
    if (this.options = { ...this.#o, ...t }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const e = ji(this.options);
      e.data !== void 0 && (this.setState(
        Vi(e.data, e.dataUpdatedAt)
      ), this.#e = e);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(t, e) {
    const i = si(this.state.data, t, this.options);
    return this.#s({
      data: i,
      type: "success",
      dataUpdatedAt: e?.updatedAt,
      manual: e?.manual
    }), i;
  }
  setState(t, e) {
    this.#s({ type: "setState", state: t, setStateOptions: e });
  }
  cancel(t) {
    const e = this.#n?.promise;
    return this.#n?.cancel(t), e ? e.then(be).catch(be) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({ silent: !0 });
  }
  reset() {
    this.destroy(), this.setState(this.#e);
  }
  isActive() {
    return this.observers.some(
      (t) => Re(t.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === bi || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => qe(t.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => t.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(t = 0) {
    return this.state.data === void 0 ? !0 : t === "static" ? !1 : this.state.isInvalidated ? !0 : !Pn(this.state.dataUpdatedAt, t);
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
    this.state.isInvalidated || this.#s({ type: "invalidate" });
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
    }, s = () => {
      const a = Ln(this.options, e), d = (() => {
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
        fetchFn: s
      };
      return r(a), a;
    })();
    this.options.behavior?.onFetch(l, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== l.fetchOptions?.meta) && this.#s({ type: "fetch", meta: l.fetchOptions?.meta }), this.#n = Dn({
      initialPromise: e?.initialPromise,
      fn: l.fetchFn,
      onCancel: (a) => {
        a instanceof ai && a.revert && this.setState({
          ...this.#t,
          fetchStatus: "idle"
        }), i.abort();
      },
      onFail: (a, u) => {
        this.#s({ type: "failed", failureCount: a, error: u });
      },
      onPause: () => {
        this.#s({ type: "pause" });
      },
      onContinue: () => {
        this.#s({ type: "continue" });
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
      if (a instanceof ai) {
        if (a.silent)
          return this.#n.promise;
        if (a.revert) {
          if (this.state.data === void 0)
            throw a;
          return this.state.data;
        }
      }
      throw this.#s({
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
  #s(t) {
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
            ...Mn(i.data, this.options),
            fetchMeta: t.meta ?? null
          };
        case "success":
          const r = {
            ...i,
            ...Vi(t.data, t.dataUpdatedAt),
            dataUpdateCount: i.dataUpdateCount + 1,
            ...!t.manual && {
              fetchStatus: "idle",
              fetchFailureCount: 0,
              fetchFailureReason: null
            }
          };
          return this.#t = t.manual ? r : void 0, r;
        case "error":
          const s = t.error;
          return {
            ...i,
            error: s,
            errorUpdateCount: i.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: i.fetchFailureCount + 1,
            fetchFailureReason: s,
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
    this.state = e(this.state), se.batch(() => {
      this.observers.forEach((i) => {
        i.onQueryUpdate();
      }), this.#i.notify({ query: this, type: "updated", action: t });
    });
  }
};
function Mn(t, e) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: zn(e.networkMode) ? "fetching" : "paused",
    ...t === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function Vi(t, e) {
  return {
    data: t,
    dataUpdatedAt: e ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function ji(t) {
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
var qr = class extends st {
  constructor(t, e) {
    super(), this.options = e, this.#e = t, this.#s = null, this.#a = oi(), this.bindMethods(), this.setOptions(e);
  }
  #e;
  #t = void 0;
  #i = void 0;
  #r = void 0;
  #n;
  #o;
  #a;
  #s;
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
    this.listeners.size === 1 && (this.#t.addObserver(this), Qi(this.#t, this.options) ? this.#u() : this.updateResult(), this.#b());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return li(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return li(
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
    if (this.options = this.#e.defaultQueryOptions(t), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof Re(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), e._defaulted && !Dt(this.options, e) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const r = this.hasListeners();
    r && Ki(
      this.#t,
      i,
      this.options,
      e
    ) && this.#u(), this.updateResult(), r && (this.#t !== i || Re(this.options.enabled, this.#t) !== Re(e.enabled, this.#t) || qe(this.options.staleTime, this.#t) !== qe(e.staleTime, this.#t)) && this.#g();
    const s = this.#y();
    r && (this.#t !== i || Re(this.options.enabled, this.#t) !== Re(e.enabled, this.#t) || s !== this.#l) && this.#_(s);
  }
  getOptimisticResult(t) {
    const e = this.#e.getQueryCache().build(this.#e, t), i = this.createResult(e, t);
    return jr(this, i) && (this.#r = i, this.#o = this.options, this.#n = this.#t.state), i;
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
    return t?.throwOnError || (e = e.catch(be)), e;
  }
  #g() {
    this.#v();
    const t = qe(
      this.options.staleTime,
      this.#t
    );
    if (et || this.#r.isStale || !ni(t))
      return;
    const i = Pn(this.#r.dataUpdatedAt, t) + 1;
    this.#c = Xe.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(t) {
    this.#x(), this.#l = t, !(et || Re(this.options.enabled, this.#t) === !1 || !ni(this.#l) || this.#l === 0) && (this.#d = Xe.setInterval(() => {
      (this.options.refetchIntervalInBackground || xi.isFocused()) && this.#u();
    }, this.#l));
  }
  #b() {
    this.#g(), this.#_(this.#y());
  }
  #v() {
    this.#c && (Xe.clearTimeout(this.#c), this.#c = void 0);
  }
  #x() {
    this.#d && (Xe.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(t, e) {
    const i = this.#t, r = this.options, s = this.#r, o = this.#n, l = this.#o, u = t !== i ? t.state : this.#i, { state: d } = t;
    let h = { ...d }, c = !1, p;
    if (e._optimisticResults) {
      const D = this.hasListeners(), V = !D && Qi(t, e), K = D && Ki(t, i, e, r);
      (V || K) && (h = {
        ...h,
        ...Mn(d.data, t.options)
      }), e._optimisticResults === "isRestoring" && (h.fetchStatus = "idle");
    }
    let { error: f, errorUpdatedAt: y, status: v } = h;
    p = h.data;
    let O = !1;
    if (e.placeholderData !== void 0 && p === void 0 && v === "pending") {
      let D;
      s?.isPlaceholderData && e.placeholderData === l?.placeholderData ? (D = s.data, O = !0) : D = typeof e.placeholderData == "function" ? e.placeholderData(
        this.#p?.state.data,
        this.#p
      ) : e.placeholderData, D !== void 0 && (v = "success", p = si(
        s?.data,
        D,
        e
      ), c = !0);
    }
    if (e.select && p !== void 0 && !O)
      if (s && p === o?.data && e.select === this.#m)
        p = this.#h;
      else
        try {
          this.#m = e.select, p = e.select(p), p = si(s?.data, p, e), this.#h = p, this.#s = null;
        } catch (D) {
          this.#s = D;
        }
    this.#s && (f = this.#s, p = this.#h, y = Date.now(), v = "error");
    const C = h.fetchStatus === "fetching", w = v === "pending", b = v === "error", E = w && C, k = p !== void 0, W = {
      status: v,
      fetchStatus: h.fetchStatus,
      isPending: w,
      isSuccess: v === "success",
      isError: b,
      isInitialLoading: E,
      isLoading: E,
      data: p,
      dataUpdatedAt: h.dataUpdatedAt,
      error: f,
      errorUpdatedAt: y,
      failureCount: h.fetchFailureCount,
      failureReason: h.fetchFailureReason,
      errorUpdateCount: h.errorUpdateCount,
      isFetched: h.dataUpdateCount > 0 || h.errorUpdateCount > 0,
      isFetchedAfterMount: h.dataUpdateCount > u.dataUpdateCount || h.errorUpdateCount > u.errorUpdateCount,
      isFetching: C,
      isRefetching: C && !w,
      isLoadingError: b && !k,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: c,
      isRefetchError: b && k,
      isStale: Si(t, e),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: Re(e.enabled, t) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const D = W.data !== void 0, V = W.status === "error" && !D, K = (X) => {
        V ? X.reject(W.error) : D && X.resolve(W.data);
      }, U = () => {
        const X = this.#a = W.promise = oi();
        K(X);
      }, Z = this.#a;
      switch (Z.status) {
        case "pending":
          t.queryHash === i.queryHash && K(Z);
          break;
        case "fulfilled":
          (V || W.data !== Z.value) && U();
          break;
        case "rejected":
          (!V || W.error !== Z.reason) && U();
          break;
      }
    }
    return W;
  }
  updateResult() {
    const t = this.#r, e = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#p = this.#t), Dt(e, t))
      return;
    this.#r = e;
    const i = () => {
      if (!t)
        return !0;
      const { notifyOnChangeProps: r } = this.options, s = typeof r == "function" ? r() : r;
      if (s === "all" || !s && !this.#f.size)
        return !0;
      const o = new Set(
        s ?? this.#f
      );
      return this.options.throwOnError && o.add("error"), Object.keys(this.#r).some((l) => {
        const a = l;
        return this.#r[a] !== t[a] && o.has(a);
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
    se.batch(() => {
      t.listeners && this.listeners.forEach((e) => {
        e(this.#r);
      }), this.#e.getQueryCache().notify({
        query: this.#t,
        type: "observerResultsUpdated"
      });
    });
  }
};
function Vr(t, e) {
  return Re(e.enabled, t) !== !1 && t.state.data === void 0 && !(t.state.status === "error" && e.retryOnMount === !1);
}
function Qi(t, e) {
  return Vr(t, e) || t.state.data !== void 0 && li(t, e, e.refetchOnMount);
}
function li(t, e, i) {
  if (Re(e.enabled, t) !== !1 && qe(e.staleTime, t) !== "static") {
    const r = typeof i == "function" ? i(t) : i;
    return r === "always" || r !== !1 && Si(t, e);
  }
  return !1;
}
function Ki(t, e, i, r) {
  return (t !== e || Re(r.enabled, t) === !1) && (!i.suspense || t.state.status !== "error") && Si(t, i);
}
function Si(t, e) {
  return Re(e.enabled, t) !== !1 && t.isStaleByTime(qe(e.staleTime, t));
}
function jr(t, e) {
  return !Dt(t.getCurrentResult(), e);
}
function Yi(t) {
  return {
    onFetch: (e, i) => {
      const r = e.options, s = e.fetchOptions?.meta?.fetchMore?.direction, o = e.state.data?.pages || [], l = e.state.data?.pageParams || [];
      let a = { pages: [], pageParams: [] }, u = 0;
      const d = async () => {
        let h = !1;
        const c = (y) => {
          Mr(
            y,
            () => e.signal,
            () => h = !0
          );
        }, p = Ln(e.options, e.fetchOptions), f = async (y, v, O) => {
          if (h)
            return Promise.reject();
          if (v == null && y.pages.length)
            return Promise.resolve(y);
          const w = (() => {
            const z = {
              client: e.client,
              queryKey: e.queryKey,
              pageParam: v,
              direction: O ? "backward" : "forward",
              meta: e.options.meta
            };
            return c(z), z;
          })(), b = await p(w), { maxPages: E } = e.options, k = O ? Nr : Dr;
          return {
            pages: k(y.pages, b, E),
            pageParams: k(y.pageParams, v, E)
          };
        };
        if (s && o.length) {
          const y = s === "backward", v = y ? Qr : Xi, O = {
            pages: o,
            pageParams: l
          }, C = v(r, O);
          a = await f(O, C, y);
        } else {
          const y = t ?? o.length;
          do {
            const v = u === 0 ? l[0] ?? r.initialPageParam : Xi(r, a);
            if (u > 0 && v == null)
              break;
            a = await f(a, v), u++;
          } while (u < y);
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
function Xi(t, { pages: e, pageParams: i }) {
  const r = e.length - 1;
  return e.length > 0 ? t.getNextPageParam(
    e[r],
    e,
    i[r],
    i
  ) : void 0;
}
function Qr(t, { pages: e, pageParams: i }) {
  return e.length > 0 ? t.getPreviousPageParam?.(e[0], e, i[0], i) : void 0;
}
var Kr = class extends Nn {
  #e;
  #t;
  #i;
  #r;
  constructor(t) {
    super(), this.#e = t.client, this.mutationId = t.mutationId, this.#i = t.mutationCache, this.#t = [], this.state = t.state || Un(), this.setOptions(t.options), this.scheduleGc();
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
    this.#r = Dn({
      fn: () => this.options.mutationFn ? this.options.mutationFn(t, i) : Promise.reject(new Error("No mutationFn found")),
      onFail: (o, l) => {
        this.#n({ type: "failed", failureCount: o, error: l });
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
    const r = this.state.status === "pending", s = !this.#r.canStart();
    try {
      if (r)
        e();
      else {
        this.#n({ type: "pending", variables: t, isPaused: s }), this.#i.config.onMutate && await this.#i.config.onMutate(
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
          isPaused: s
        });
      }
      const o = await this.#r.start();
      return await this.#i.config.onSuccess?.(
        o,
        t,
        this.state.context,
        this,
        i
      ), await this.options.onSuccess?.(
        o,
        t,
        this.state.context,
        i
      ), await this.#i.config.onSettled?.(
        o,
        null,
        this.state.variables,
        this.state.context,
        this,
        i
      ), await this.options.onSettled?.(
        o,
        null,
        t,
        this.state.context,
        i
      ), this.#n({ type: "success", data: o }), o;
    } catch (o) {
      try {
        await this.#i.config.onError?.(
          o,
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
          o,
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
          o,
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
          o,
          t,
          this.state.context,
          i
        );
      } catch (l) {
        Promise.reject(l);
      }
      throw this.#n({ type: "error", error: o }), o;
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
    this.state = e(this.state), se.batch(() => {
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
function Un() {
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
var Yr = class extends st {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(t, e, i) {
    const r = new Kr({
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
    const e = xt(t);
    if (typeof e == "string") {
      const i = this.#t.get(e);
      i ? i.push(t) : this.#t.set(e, [t]);
    }
    this.notify({ type: "added", mutation: t });
  }
  remove(t) {
    if (this.#e.delete(t)) {
      const e = xt(t);
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
    const e = xt(t);
    if (typeof e == "string") {
      const r = this.#t.get(e)?.find(
        (s) => s.state.status === "pending"
      );
      return !r || r === t;
    } else
      return !0;
  }
  runNext(t) {
    const e = xt(t);
    return typeof e == "string" ? this.#t.get(e)?.find((r) => r !== t && r.state.isPaused)?.continue() ?? Promise.resolve() : Promise.resolve();
  }
  clear() {
    se.batch(() => {
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
      (i) => $i(e, i)
    );
  }
  findAll(t = {}) {
    return this.getAll().filter((e) => $i(t, e));
  }
  notify(t) {
    se.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  resumePausedMutations() {
    const t = this.getAll().filter((e) => e.state.isPaused);
    return se.batch(
      () => Promise.all(
        t.map((e) => e.continue().catch(be))
      )
    );
  }
};
function xt(t) {
  return t.options.scope?.id;
}
var Xr = class extends st {
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
    this.options = this.#e.defaultMutationOptions(e), Dt(this.options, i) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), i?.mutationKey && this.options.mutationKey && tt(i.mutationKey) !== tt(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
  }
  onUnsubscribe() {
    this.hasListeners() || this.#i?.removeObserver(this);
  }
  onMutationUpdate(e) {
    this.#n(), this.#o(e);
  }
  getCurrentResult() {
    return this.#t;
  }
  reset() {
    this.#i?.removeObserver(this), this.#i = void 0, this.#n(), this.#o();
  }
  mutate(e, i) {
    return this.#r = i, this.#i?.removeObserver(this), this.#i = this.#e.getMutationCache().build(this.#e, this.options), this.#i.addObserver(this), this.#i.execute(e);
  }
  #n() {
    const e = this.#i?.state ?? Un();
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
  #o(e) {
    se.batch(() => {
      if (this.#r && this.hasListeners()) {
        const i = this.#t.variables, r = this.#t.context, s = {
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
              s
            );
          } catch (o) {
            Promise.reject(o);
          }
          try {
            this.#r.onSettled?.(
              e.data,
              null,
              i,
              r,
              s
            );
          } catch (o) {
            Promise.reject(o);
          }
        } else if (e?.type === "error") {
          try {
            this.#r.onError?.(
              e.error,
              i,
              r,
              s
            );
          } catch (o) {
            Promise.reject(o);
          }
          try {
            this.#r.onSettled?.(
              void 0,
              e.error,
              i,
              r,
              s
            );
          } catch (o) {
            Promise.reject(o);
          }
        }
      }
      this.listeners.forEach((i) => {
        i(this.#t);
      });
    });
  }
}, Jr = class extends st {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(t, e, i) {
    const r = e.queryKey, s = e.queryHash ?? _i(r, e);
    let o = this.get(s);
    return o || (o = new Hr({
      client: t,
      queryKey: r,
      queryHash: s,
      options: t.defaultQueryOptions(e),
      state: i,
      defaultOptions: t.getQueryDefaults(r)
    }), this.add(o)), o;
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
    se.batch(() => {
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
      (i) => Gi(e, i)
    );
  }
  findAll(t = {}) {
    const e = this.getAll();
    return Object.keys(t).length > 0 ? e.filter((i) => Gi(t, i)) : e;
  }
  notify(t) {
    se.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  onFocus() {
    se.batch(() => {
      this.getAll().forEach((t) => {
        t.onFocus();
      });
    });
  }
  onOnline() {
    se.batch(() => {
      this.getAll().forEach((t) => {
        t.onOnline();
      });
    });
  }
}, Zr = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  #s;
  constructor(t = {}) {
    this.#e = t.queryCache || new Jr(), this.#t = t.mutationCache || new Yr(), this.#i = t.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = xi.subscribe(async (t) => {
      t && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = Nt.subscribe(async (t) => {
      t && (await this.resumePausedMutations(), this.#e.onOnline());
    }));
  }
  unmount() {
    this.#o--, this.#o === 0 && (this.#a?.(), this.#a = void 0, this.#s?.(), this.#s = void 0);
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
    return r === void 0 ? this.fetchQuery(t) : (t.revalidateIfStale && i.isStaleByTime(qe(e.staleTime, i)) && this.prefetchQuery(e), Promise.resolve(r));
  }
  getQueriesData(t) {
    return this.#e.findAll(t).map(({ queryKey: e, state: i }) => {
      const r = i.data;
      return [e, r];
    });
  }
  setQueryData(t, e, i) {
    const r = this.defaultQueryOptions({ queryKey: t }), o = this.#e.get(
      r.queryHash
    )?.state.data, l = Fr(e, o);
    if (l !== void 0)
      return this.#e.build(this, r).setData(l, { ...i, manual: !0 });
  }
  setQueriesData(t, e, i) {
    return se.batch(
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
    se.batch(() => {
      e.findAll(t).forEach((i) => {
        e.remove(i);
      });
    });
  }
  resetQueries(t, e) {
    const i = this.#e;
    return se.batch(() => (i.findAll(t).forEach((r) => {
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
    const i = { revert: !0, ...e }, r = se.batch(
      () => this.#e.findAll(t).map((s) => s.cancel(i))
    );
    return Promise.all(r).then(be).catch(be);
  }
  invalidateQueries(t, e = {}) {
    return se.batch(() => (this.#e.findAll(t).forEach((i) => {
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
    }, r = se.batch(
      () => this.#e.findAll(t).filter((s) => !s.isDisabled() && !s.isStatic()).map((s) => {
        let o = s.fetch(void 0, i);
        return i.throwOnError || (o = o.catch(be)), s.state.fetchStatus === "paused" ? Promise.resolve() : o;
      })
    );
    return Promise.all(r).then(be);
  }
  fetchQuery(t) {
    const e = this.defaultQueryOptions(t);
    e.retry === void 0 && (e.retry = !1);
    const i = this.#e.build(this, e);
    return i.isStaleByTime(
      qe(e.staleTime, i)
    ) ? i.fetch(e) : Promise.resolve(i.state.data);
  }
  prefetchQuery(t) {
    return this.fetchQuery(t).then(be).catch(be);
  }
  fetchInfiniteQuery(t) {
    return t.behavior = Yi(t.pages), this.fetchQuery(t);
  }
  prefetchInfiniteQuery(t) {
    return this.fetchInfiniteQuery(t).then(be).catch(be);
  }
  ensureInfiniteQueryData(t) {
    return t.behavior = Yi(t.pages), this.ensureQueryData(t);
  }
  resumePausedMutations() {
    return Nt.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
    this.#r.set(tt(t), {
      queryKey: t,
      defaultOptions: e
    });
  }
  getQueryDefaults(t) {
    const e = [...this.#r.values()], i = {};
    return e.forEach((r) => {
      mt(t, r.queryKey) && Object.assign(i, r.defaultOptions);
    }), i;
  }
  setMutationDefaults(t, e) {
    this.#n.set(tt(t), {
      mutationKey: t,
      defaultOptions: e
    });
  }
  getMutationDefaults(t) {
    const e = [...this.#n.values()], i = {};
    return e.forEach((r) => {
      mt(t, r.mutationKey) && Object.assign(i, r.defaultOptions);
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
    return e.queryHash || (e.queryHash = _i(
      e.queryKey,
      e
    )), e.refetchOnReconnect === void 0 && (e.refetchOnReconnect = e.networkMode !== "always"), e.throwOnError === void 0 && (e.throwOnError = !!e.suspense), !e.networkMode && e.persister && (e.networkMode = "offlineFirst"), e.queryFn === bi && (e.enabled = !1), e;
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
function es(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function Ji(t, e) {
  for (var i in t) if (i !== "__source" && !(i in e)) return !0;
  for (var r in e) if (r !== "__source" && t[r] !== e[r]) return !0;
  return !1;
}
function Bn(t, e) {
  var i = e(), r = x({ t: { __: i, u: e } }), s = r[0].t, o = r[1];
  return fr(function() {
    s.__ = i, s.u = e, $t(s) && o({ t: s });
  }, [t, i, e]), ce(function() {
    return $t(s) && o({ t: s }), t(function() {
      $t(s) && o({ t: s });
    });
  }, [t]), i;
}
function $t(t) {
  var e, i, r = t.u, s = t.__;
  try {
    var o = r();
    return !((e = s) === (i = o) && (e !== 0 || 1 / e == 1 / i) || e != e && i != i);
  } catch {
    return !0;
  }
}
function Zi(t, e) {
  this.props = t, this.context = e;
}
(Zi.prototype = new We()).isPureReactComponent = !0, Zi.prototype.shouldComponentUpdate = function(t, e) {
  return Ji(this.props, t) || Ji(this.state, e);
};
var en = M.__b;
M.__b = function(t) {
  t.type && t.type.__f && t.ref && (t.props.ref = t.ref, t.ref = null), en && en(t);
};
var ts = M.__e;
M.__e = function(t, e, i, r) {
  if (t.then) {
    for (var s, o = e; o = o.__; ) if ((s = o.__c) && s.__c) return e.__e == null && (e.__e = i.__e, e.__k = i.__k), s.__c(t, e);
  }
  ts(t, e, i, r);
};
var tn = M.unmount;
function Wn(t, e, i) {
  return t && (t.__c && t.__c.__H && (t.__c.__H.__.forEach(function(r) {
    typeof r.__c == "function" && r.__c();
  }), t.__c.__H = null), (t = es({}, t)).__c != null && (t.__c.__P === i && (t.__c.__P = e), t.__c.__e = !0, t.__c = null), t.__k = t.__k && t.__k.map(function(r) {
    return Wn(r, e, i);
  })), t;
}
function Gn(t, e, i) {
  return t && i && (t.__v = null, t.__k = t.__k && t.__k.map(function(r) {
    return Gn(r, e, i);
  }), t.__c && t.__c.__P === e && (t.__e && i.appendChild(t.__e), t.__c.__e = !0, t.__c.__P = i)), t;
}
function Ht() {
  this.__u = 0, this.o = null, this.__b = null;
}
function $n(t) {
  if (!t.__) return null;
  var e = t.__.__c;
  return e && e.__a && e.__a(t);
}
function St() {
  this.i = null, this.l = null;
}
M.unmount = function(t) {
  var e = t.__c;
  e && (e.__z = !0), e && e.__R && e.__R(), e && 32 & t.__u && (t.type = null), tn && tn(t);
}, (Ht.prototype = new We()).__c = function(t, e) {
  var i = e.__c, r = this;
  r.o == null && (r.o = []), r.o.push(i);
  var s = $n(r.__v), o = !1, l = function() {
    o || r.__z || (o = !0, i.__R = null, s ? s(u) : u());
  };
  i.__R = l;
  var a = i.__P;
  i.__P = null;
  var u = function() {
    if (!--r.__u) {
      if (r.state.__a) {
        var d = r.state.__a;
        r.__v.__k[0] = Gn(d, d.__c.__P, d.__c.__O);
      }
      var h;
      for (r.setState({ __a: r.__b = null }); h = r.o.pop(); ) h.__P = a, h.forceUpdate();
    }
  };
  r.__u++ || 32 & e.__u || r.setState({ __a: r.__b = r.__v.__k[0] }), t.then(l, l);
}, Ht.prototype.componentWillUnmount = function() {
  this.o = [];
}, Ht.prototype.render = function(t, e) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), r = this.__v.__k[0].__c;
      this.__v.__k[0] = Wn(this.__b, i, r.__O = r.__P);
    }
    this.__b = null;
  }
  var s = e.__a && Zt(Y, null, t.fallback);
  return s && (s.__u &= -33), [Zt(Y, null, e.__a ? null : t.children), s];
};
var nn = function(t, e, i) {
  if (++i[1] === i[0] && t.l.delete(e), t.props.revealOrder && (t.props.revealOrder[0] !== "t" || !t.l.size)) for (i = t.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    t.i = i = i[2];
  }
};
(St.prototype = new We()).__a = function(t) {
  var e = this, i = $n(e.__v), r = e.l.get(t);
  return r[0]++, function(s) {
    var o = function() {
      e.props.revealOrder ? (r.push(s), nn(e, t, r)) : s();
    };
    i ? i(o) : o();
  };
}, St.prototype.render = function(t) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var e = zt(t.children);
  t.revealOrder && t.revealOrder[0] === "b" && e.reverse();
  for (var i = e.length; i--; ) this.l.set(e[i], this.i = [1, 0, this.i]);
  return t.children;
}, St.prototype.componentDidUpdate = St.prototype.componentDidMount = function() {
  var t = this;
  this.l.forEach(function(e, i) {
    nn(t, i, e);
  });
};
var is = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, ns = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, rs = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, ss = /[A-Z0-9]/g, os = typeof document < "u", as = function(t) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(t);
};
We.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t) {
  Object.defineProperty(We.prototype, t, { configurable: !0, get: function() {
    return this["UNSAFE_" + t];
  }, set: function(e) {
    Object.defineProperty(this, t, { configurable: !0, writable: !0, value: e });
  } });
});
var rn = M.event;
function ls() {
}
function cs() {
  return this.cancelBubble;
}
function ds() {
  return this.defaultPrevented;
}
M.event = function(t) {
  return rn && (t = rn(t)), t.persist = ls, t.isPropagationStopped = cs, t.isDefaultPrevented = ds, t.nativeEvent = t;
};
var us = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, sn = M.vnode;
M.vnode = function(t) {
  typeof t.type == "string" && (function(e) {
    var i = e.props, r = e.type, s = {}, o = r.indexOf("-") === -1;
    for (var l in i) {
      var a = i[l];
      if (!(l === "value" && "defaultValue" in i && a == null || os && l === "children" && r === "noscript" || l === "class" || l === "className")) {
        var u = l.toLowerCase();
        l === "defaultValue" && "value" in i && i.value == null ? l = "value" : l === "download" && a === !0 ? a = "" : u === "translate" && a === "no" ? a = !1 : u[0] === "o" && u[1] === "n" ? u === "ondoubleclick" ? l = "ondblclick" : u !== "onchange" || r !== "input" && r !== "textarea" || as(i.type) ? u === "onfocus" ? l = "onfocusin" : u === "onblur" ? l = "onfocusout" : rs.test(l) && (l = u) : u = l = "oninput" : o && ns.test(l) ? l = l.replace(ss, "-$&").toLowerCase() : a === null && (a = void 0), u === "oninput" && s[l = u] && (l = "oninputCapture"), s[l] = a;
      }
    }
    r == "select" && s.multiple && Array.isArray(s.value) && (s.value = zt(i.children).forEach(function(d) {
      d.props.selected = s.value.indexOf(d.props.value) != -1;
    })), r == "select" && s.defaultValue != null && (s.value = zt(i.children).forEach(function(d) {
      d.props.selected = s.multiple ? s.defaultValue.indexOf(d.props.value) != -1 : s.defaultValue == d.props.value;
    })), i.class && !i.className ? (s.class = i.class, Object.defineProperty(s, "className", us)) : (i.className && !i.class || i.class && i.className) && (s.class = s.className = i.className), e.props = s;
  })(t), t.$$typeof = is, sn && sn(t);
};
var on = M.__r;
M.__r = function(t) {
  on && on(t), t.__c;
};
var an = M.diffed;
M.diffed = function(t) {
  an && an(t);
  var e = t.props, i = t.__e;
  i != null && t.type === "textarea" && "value" in e && e.value !== i.value && (i.value = e.value == null ? "" : e.value);
};
var Hn = mi(
  void 0
), _t = (t) => {
  const e = gi(Hn);
  if (!e)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return e;
}, hs = ({
  client: t,
  children: e
}) => (ce(() => (t.mount(), () => {
  t.unmount();
}), [t]), /* @__PURE__ */ n(Hn.Provider, { value: t, children: e })), qn = mi(!1), ps = () => gi(qn);
qn.Provider;
function fs() {
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
var ms = mi(fs()), gs = () => gi(ms), ys = (t, e, i) => {
  const r = i?.state.error && typeof t.throwOnError == "function" ? vi(t.throwOnError, [i.state.error, i]) : t.throwOnError;
  (t.suspense || t.experimental_prefetchInRender || r) && (e.isReset() || (t.retryOnMount = !1));
}, _s = (t) => {
  ce(() => {
    t.clearReset();
  }, [t]);
}, bs = ({
  result: t,
  errorResetBoundary: e,
  throwOnError: i,
  query: r,
  suspense: s
}) => t.isError && !e.isReset() && !t.isFetching && r && (s && t.data === void 0 || vi(i, [t.error, r])), vs = (t) => {
  if (t.suspense) {
    const i = (s) => s === "static" ? s : Math.max(s ?? 1e3, 1e3), r = t.staleTime;
    t.staleTime = typeof r == "function" ? (...s) => i(r(...s)) : i(r), typeof t.gcTime == "number" && (t.gcTime = Math.max(
      t.gcTime,
      1e3
    ));
  }
}, xs = (t, e) => t.isLoading && t.isFetching && !e, Ss = (t, e) => t?.suspense && e.isPending, ln = (t, e, i) => e.fetchOptimistic(t).catch(() => {
  i.clearReset();
});
function ws(t, e, i) {
  const r = ps(), s = gs(), o = _t(), l = o.defaultQueryOptions(t);
  o.getDefaultOptions().queries?._experimental_beforeQuery?.(
    l
  );
  const a = o.getQueryCache().get(l.queryHash);
  l._optimisticResults = r ? "isRestoring" : "optimistic", vs(l), ys(l, s, a), _s(s);
  const u = !o.getQueryCache().get(l.queryHash), [d] = x(
    () => new e(
      o,
      l
    )
  ), h = d.getOptimisticResult(l), c = !r && t.subscribed !== !1;
  if (Bn(
    Pe(
      (p) => {
        const f = c ? d.subscribe(se.batchCalls(p)) : be;
        return d.updateResult(), f;
      },
      [d, c]
    ),
    () => d.getCurrentResult()
  ), ce(() => {
    d.setOptions(l);
  }, [l, d]), Ss(l, h))
    throw ln(l, d, s);
  if (bs({
    result: h,
    errorResetBoundary: s,
    throwOnError: l.throwOnError,
    query: a,
    suspense: l.suspense
  }))
    throw h.error;
  return o.getDefaultOptions().queries?._experimental_afterQuery?.(
    l,
    h
  ), l.experimental_prefetchInRender && !et && xs(h, r) && (u ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    ln(l, d, s)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    a?.promise
  ))?.catch(be).finally(() => {
    d.updateResult();
  }), l.notifyOnChangeProps ? h : d.trackResult(h);
}
function Bt(t, e) {
  return ws(t, qr);
}
function it(t, e) {
  const i = _t(), [r] = x(
    () => new Xr(
      i,
      t
    )
  );
  ce(() => {
    r.setOptions(t);
  }, [r, t]);
  const s = Bn(
    Pe(
      (l) => r.subscribe(se.batchCalls(l)),
      [r]
    ),
    () => r.getCurrentResult()
  ), o = Pe(
    (l, a) => {
      r.mutate(l, a).catch(be);
    },
    [r]
  );
  if (s.error && vi(r.options.throwOnError, [s.error]))
    throw s.error;
  return { ...s, mutate: o, mutateAsync: s.mutate };
}
const q = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif", m = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "100%",
    minHeight: "100%",
    fontFamily: q
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
    fontFamily: q
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
    fontFamily: q
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
    fontFamily: q
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: q
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
    fontFamily: q,
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
    fontFamily: q
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
    fontFamily: q
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
}, Es = `
* { font-family: ${q}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function $({
  variant: t,
  children: e,
  onClick: i,
  type: r = "button",
  title: s,
  active: o = !1,
  style: l,
  class: a,
  disabled: u,
  "aria-label": d
}) {
  const h = t === "primary" ? m.primaryBtn : t === "secondary" ? m.secondaryBtn : t === "icon" ? m.iconBtn : t === "iconSm" ? m.iconBtnSm : t === "placement" ? m.placementBtn(o) : {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.25rem",
    fontFamily: q
  }, c = l ? { ...h, ...l } : h;
  return /* @__PURE__ */ n(
    "button",
    {
      type: r,
      style: c,
      class: a,
      onClick: i,
      title: s,
      disabled: u,
      "aria-label": d,
      children: e
    }
  );
}
const Cs = [
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
function ks({ onAddBlock: t, onClose: e }) {
  return /* @__PURE__ */ n("div", { style: {
    width: "210px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #e2e8f0",
    background: "#fff",
    fontFamily: q
  }, children: [
    /* @__PURE__ */ n("div", { style: { padding: "1.25rem 1rem", borderBottom: "1px solid #e2e8f0" }, children: [
      /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }, children: "Building Blocks" }),
      /* @__PURE__ */ n("div", { style: { fontSize: "0.65rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.2rem" }, children: "Click to add component" })
    ] }),
    /* @__PURE__ */ n("div", { style: { flex: 1, overflowY: "auto", padding: "0.75rem" }, children: Cs.map((i) => /* @__PURE__ */ n("div", { style: { marginBottom: "1.25rem" }, children: [
      /* @__PURE__ */ n("div", { style: m.sectionLabel, children: i.label }),
      /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.3rem" }, children: i.blocks.map(({ type: r, icon: s, label: o }) => /* @__PURE__ */ n(
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
            fontFamily: q,
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
            /* @__PURE__ */ n("iconify-icon", { icon: s, style: { fontSize: "1rem", color: "#64748b", flexShrink: 0 } }),
            o
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
          fontFamily: q
        },
        children: "Close Editor"
      }
    ) })
  ] });
}
const cn = [
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
function wt({
  choices: t,
  onChange: e,
  inputType: i = "radio",
  allowOther: r,
  onAllowOtherChange: s,
  showRandomize: o,
  randomize: l,
  onRandomizeChange: a
}) {
  const [u, d] = x(!1), [h, c] = x(""), p = (b, E) => {
    const k = [...t];
    k[b] = E, e(k);
  }, f = (b) => {
    const E = [...t];
    E.splice(b + 1, 0, `Option ${E.length + 1}`), e(E);
  }, y = (b) => {
    e(t.filter((E, k) => k !== b));
  }, v = (b, E) => {
    const k = [...t], z = b + E;
    z < 0 || z >= k.length || ([k[b], k[z]] = [k[z], k[b]], e(k));
  }, O = (b) => {
    const E = cn.find((k) => k.label === b);
    E && e([...E.choices]);
  }, C = () => {
    const b = h.split(`
`).map((E) => E.trim()).filter(Boolean);
    b.length && e(b), d(!1), c("");
  }, w = i === "checkbox" ? "□" : "○";
  return /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "6px", fontFamily: q }, children: [
    /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }, children: [
      /* @__PURE__ */ n("span", { style: { fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }, children: "Answer Genius" }),
      /* @__PURE__ */ n(
        "select",
        {
          onChange: (b) => O(b.target.value),
          defaultValue: "",
          style: {
            fontSize: "0.72rem",
            padding: "3px 6px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            background: "#f8fafc",
            color: "#334155",
            fontFamily: q,
            cursor: "pointer"
          },
          children: [
            /* @__PURE__ */ n("option", { value: "", disabled: !0, children: "Select preset…" }),
            cn.map((b) => /* @__PURE__ */ n("option", { value: b.label, children: b.label }, b.label))
          ]
        }
      )
    ] }),
    t.map((b, E) => /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "5px" }, children: [
      /* @__PURE__ */ n("span", { style: { fontSize: "13px", color: "#cbd5e1", width: "14px", flexShrink: 0, userSelect: "none" }, children: w }),
      /* @__PURE__ */ n(
        "input",
        {
          type: "text",
          value: b,
          onInput: (k) => p(E, k.target.value),
          style: {
            flex: 1,
            padding: "5px 8px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "0.8rem",
            fontFamily: q,
            color: "#1e293b",
            background: "#fafafa",
            outline: "none"
          },
          onFocus: (k) => {
            k.target.style.borderColor = "#3b82f6";
          },
          onBlur: (k) => {
            k.target.style.borderColor = "#e2e8f0";
          }
        }
      ),
      /* @__PURE__ */ n("button", { onClick: () => f(E), title: "Add below", style: Et, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus", style: { fontSize: "12px" } }) }),
      /* @__PURE__ */ n("button", { onClick: () => v(E, -1), disabled: E === 0, title: "Move up", style: { ...Et, opacity: E === 0 ? 0.35 : 1 }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-up", style: { fontSize: "12px" } }) }),
      /* @__PURE__ */ n("button", { onClick: () => v(E, 1), disabled: E === t.length - 1, title: "Move down", style: { ...Et, opacity: E === t.length - 1 ? 0.35 : 1 }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-down", style: { fontSize: "12px" } }) }),
      /* @__PURE__ */ n("button", { onClick: () => y(E), title: "Delete", style: { ...Et, color: "#ef4444" }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "12px" } }) })
    ] }, E)),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: "12px", marginTop: "2px" }, children: [
      /* @__PURE__ */ n(
        "button",
        {
          onClick: () => e([...t, `Option ${t.length + 1}`]),
          style: { fontSize: "0.72rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: q, fontWeight: 600, padding: 0 },
          children: "⊕ Add choice"
        }
      ),
      /* @__PURE__ */ n(
        "button",
        {
          onClick: () => d(!u),
          style: { fontSize: "0.72rem", color: "#64748b", background: "none", border: "none", cursor: "pointer", fontFamily: q, fontWeight: 500, padding: 0 },
          children: "≡ Bulk add"
        }
      )
    ] }),
    u && /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "6px" }, children: [
      /* @__PURE__ */ n(
        "textarea",
        {
          value: h,
          onInput: (b) => c(b.target.value),
          placeholder: "One choice per line…",
          rows: 4,
          style: {
            width: "100%",
            padding: "6px 8px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "0.8rem",
            fontFamily: q,
            resize: "vertical",
            color: "#1e293b",
            boxSizing: "border-box"
          }
        }
      ),
      /* @__PURE__ */ n("div", { style: { display: "flex", gap: "6px" }, children: [
        /* @__PURE__ */ n("button", { onClick: C, style: { ...dn, background: "#3b82f6", color: "#fff" }, children: "Apply" }),
        /* @__PURE__ */ n("button", { onClick: () => d(!1), style: { ...dn, background: "#f1f5f9", color: "#64748b" }, children: "Cancel" })
      ] })
    ] }),
    (s !== void 0 || a !== void 0) && /* @__PURE__ */ n("div", { style: { borderTop: "1px solid #f1f5f9", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "5px" }, children: [
      s !== void 0 && /* @__PURE__ */ n("label", { style: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#475569", cursor: "pointer" }, children: [
        /* @__PURE__ */ n(
          "input",
          {
            type: "checkbox",
            checked: !!r,
            onChange: (b) => s(b.target.checked)
          }
        ),
        'Add "Other" answer option'
      ] }),
      o && a !== void 0 && /* @__PURE__ */ n("label", { style: { display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#475569", cursor: "pointer" }, children: [
        /* @__PURE__ */ n(
          "input",
          {
            type: "checkbox",
            checked: !!l,
            onChange: (b) => a(b.target.checked)
          }
        ),
        "Randomize answer order"
      ] })
    ] })
  ] });
}
const Et = {
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
}, dn = {
  padding: "4px 12px",
  border: "none",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: q
}, Is = {
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
function N({ label: t, children: e }) {
  return /* @__PURE__ */ n("div", { style: { marginBottom: "1rem" }, children: [
    /* @__PURE__ */ n("label", { style: {
      display: "block",
      fontSize: "0.7rem",
      fontWeight: 600,
      color: "#64748b",
      marginBottom: "0.35rem",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontFamily: q
    }, children: t }),
    e
  ] });
}
const ne = {
  ...m.input,
  boxSizing: "border-box",
  fontSize: "0.85rem",
  padding: "0.55rem 0.75rem"
}, Te = {
  ...m.textarea,
  boxSizing: "border-box",
  fontSize: "0.85rem",
  padding: "0.55rem 0.75rem",
  minHeight: "unset"
}, Ct = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  border: "1px solid #e2e8f0",
  borderRadius: "0.625rem",
  fontSize: "0.85rem",
  color: "#334155",
  background: "#fff",
  fontFamily: q,
  boxSizing: "border-box"
};
function Ts({ block: t, onUpdate: e, onCancel: i, onDone: r }) {
  const s = t.settings, o = (a, u) => e(t.id, { ...s, [a]: u }), l = () => {
    switch (t.type) {
      case "text":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Theme Style", children: /* @__PURE__ */ n("select", { value: s.themeStyle || "body", onChange: (a) => o("themeStyle", a.target.value), style: Ct, children: [
            /* @__PURE__ */ n("option", { value: "title", children: "Title" }),
            /* @__PURE__ */ n("option", { value: "sub-title", children: "Sub Title" }),
            /* @__PURE__ */ n("option", { value: "body", children: "Body" })
          ] }) }),
          /* @__PURE__ */ n(N, { label: "Content", children: /* @__PURE__ */ n(
            "textarea",
            {
              value: s.content || "",
              onInput: (a) => o("content", a.target.value),
              placeholder: "Enter your text here",
              rows: 4,
              style: Te
            }
          ) })
        ] });
      case "button":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.label || "", onInput: (a) => o("label", a.target.value), placeholder: "Continue", style: ne }) }),
          /* @__PURE__ */ n(N, { label: "Action", children: /* @__PURE__ */ n("select", { value: s.action || "next", onChange: (a) => o("action", a.target.value), style: Ct, children: [
            /* @__PURE__ */ n("option", { value: "next", children: "Next / Finish" }),
            /* @__PURE__ */ n("option", { value: "dismiss", children: "Dismiss" }),
            /* @__PURE__ */ n("option", { value: "url", children: "Open URL" })
          ] }) }),
          s.action === "url" && /* @__PURE__ */ n(N, { label: "URL", children: /* @__PURE__ */ n("input", { type: "text", value: s.url || "", onInput: (a) => o("url", a.target.value), placeholder: "https://...", style: ne }) })
        ] });
      case "image":
        return /* @__PURE__ */ n(N, { label: "Image URL", children: /* @__PURE__ */ n("input", { type: "text", value: s.url || "", onInput: (a) => o("url", a.target.value), placeholder: "https://...", style: ne }) });
      case "video":
        return /* @__PURE__ */ n(N, { label: "Video Embed URL", children: /* @__PURE__ */ n("input", { type: "text", value: s.url || "", onInput: (a) => o("url", a.target.value), placeholder: "https://youtube.com/embed/...", style: ne }) });
      case "poll-text":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "How can we improve?", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Question Style", children: /* @__PURE__ */ n("select", { value: s.themeStyle || "body", onChange: (a) => o("themeStyle", a.target.value), style: Ct, children: [
            /* @__PURE__ */ n("option", { value: "title", children: "Title" }),
            /* @__PURE__ */ n("option", { value: "sub-title", children: "Sub Title" }),
            /* @__PURE__ */ n("option", { value: "body", children: "Body" })
          ] }) }),
          /* @__PURE__ */ n(N, { label: "Answer Placeholder", children: /* @__PURE__ */ n("input", { type: "text", value: s.placeholder || "", onInput: (a) => o("placeholder", a.target.value), placeholder: "Enter text here...", style: ne }) }),
          /* @__PURE__ */ n(N, { label: "Submit Button Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.submitLabel || "", onInput: (a) => o("submitLabel", a.target.value), placeholder: "Submit", style: ne }) })
        ] });
      case "poll-yes-no":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "Was this guide helpful?", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Yes Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.yesLabel || "", onInput: (a) => o("yesLabel", a.target.value), placeholder: "Yes", style: ne }) }),
          /* @__PURE__ */ n(N, { label: "No Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.noLabel || "", onInput: (a) => o("noLabel", a.target.value), placeholder: "No", style: ne }) })
        ] });
      case "poll-scale":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "How would you rate this?", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Min Value", children: /* @__PURE__ */ n("input", { type: "number", value: s.minValue ?? 1, onInput: (a) => o("minValue", Number(a.target.value)), style: ne }) }),
          /* @__PURE__ */ n(N, { label: "Max Value", children: /* @__PURE__ */ n("input", { type: "number", value: s.maxValue ?? 5, onInput: (a) => o("maxValue", Number(a.target.value)), style: ne }) }),
          /* @__PURE__ */ n(N, { label: "Show Min / Max Labels", children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ n(
              "input",
              {
                type: "checkbox",
                checked: s.showLabels ?? !0,
                onChange: (a) => o("showLabels", a.target.checked),
                style: { accentColor: "#1d4ed8", width: "16px", height: "16px", cursor: "pointer" }
              }
            ),
            /* @__PURE__ */ n("span", { style: { fontSize: "0.8rem", color: "#475569", fontFamily: q }, children: "Show labels below scale" })
          ] }) }),
          s.showLabels && /* @__PURE__ */ n(Y, { children: [
            /* @__PURE__ */ n(N, { label: `Min Label (at ${s.minValue ?? 1})`, children: /* @__PURE__ */ n(
              "input",
              {
                type: "text",
                value: s.labels?.[s.minValue ?? 1] || "",
                onInput: (a) => o("labels", { ...s.labels, [s.minValue ?? 1]: a.target.value }),
                placeholder: "e.g. Not likely",
                style: ne
              }
            ) }),
            /* @__PURE__ */ n(N, { label: `Max Label (at ${s.maxValue ?? 5})`, children: /* @__PURE__ */ n(
              "input",
              {
                type: "text",
                value: s.labels?.[s.maxValue ?? 5] || "",
                onInput: (a) => o("labels", { ...s.labels, [s.maxValue ?? 5]: a.target.value }),
                placeholder: "e.g. Very likely",
                style: ne
              }
            ) })
          ] }),
          /* @__PURE__ */ n(N, { label: "Submit Button Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.submitLabel || "", onInput: (a) => o("submitLabel", a.target.value), placeholder: "Submit", style: ne }) })
        ] });
      case "poll-nps":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "How likely are you to recommend us?", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Low End Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.lowLabel || "", onInput: (a) => o("lowLabel", a.target.value), placeholder: "Not at all likely", style: ne }) }),
          /* @__PURE__ */ n(N, { label: "High End Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.highLabel || "", onInput: (a) => o("highLabel", a.target.value), placeholder: "Extremely likely", style: ne }) })
        ] });
      case "poll-multiple-choice":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "Select an option", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Choices", children: /* @__PURE__ */ n(
            wt,
            {
              choices: s.choices || ["Option 1", "Option 2", "Option 3"],
              onChange: (a) => o("choices", a),
              inputType: "radio",
              allowOther: !!s.allowOther,
              onAllowOtherChange: (a) => o("allowOther", a),
              showRandomize: !0,
              randomize: !!s.randomize,
              onRandomizeChange: (a) => o("randomize", a)
            }
          ) })
        ] });
      case "poll-checkboxes":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "Select all that apply", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Choices", children: /* @__PURE__ */ n(
            wt,
            {
              choices: s.choices || ["Option 1", "Option 2", "Option 3"],
              onChange: (a) => o("choices", a),
              inputType: "checkbox",
              allowOther: !!s.allowOther,
              onAllowOtherChange: (a) => o("allowOther", a),
              showRandomize: !0,
              randomize: !!s.randomize,
              onRandomizeChange: (a) => o("randomize", a)
            }
          ) })
        ] });
      case "poll-star-rating":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "How would you rate your experience?", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Number of Stars", children: /* @__PURE__ */ n("select", { value: s.maxStars ?? 5, onChange: (a) => o("maxStars", Number(a.target.value)), style: Ct, children: [3, 4, 5, 6, 7, 8, 9, 10].map((a) => /* @__PURE__ */ n("option", { value: a, children: [
            a,
            " stars"
          ] }, a)) }) })
        ] });
      case "poll-dropdown":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "Select an option", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Options", children: /* @__PURE__ */ n(
            wt,
            {
              choices: s.choices || ["Option 1", "Option 2", "Option 3"],
              onChange: (a) => o("choices", a)
            }
          ) })
        ] });
      case "poll-slider":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "How satisfied are you?", rows: 3, style: Te }) }),
          /* @__PURE__ */ n("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }, children: [
            /* @__PURE__ */ n(N, { label: "Min", children: /* @__PURE__ */ n("input", { type: "number", value: s.min ?? 0, onInput: (a) => o("min", Number(a.target.value)), style: ne }) }),
            /* @__PURE__ */ n(N, { label: "Max", children: /* @__PURE__ */ n("input", { type: "number", value: s.max ?? 10, onInput: (a) => o("max", Number(a.target.value)), style: ne }) }),
            /* @__PURE__ */ n(N, { label: "Step", children: /* @__PURE__ */ n("input", { type: "number", value: s.step ?? 1, onInput: (a) => o("step", Number(a.target.value)), style: ne }) })
          ] }),
          /* @__PURE__ */ n(N, { label: "Min Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.minLabel || "", onInput: (a) => o("minLabel", a.target.value), placeholder: "Not satisfied", style: ne }) }),
          /* @__PURE__ */ n(N, { label: "Max Label", children: /* @__PURE__ */ n("input", { type: "text", value: s.maxLabel || "", onInput: (a) => o("maxLabel", a.target.value), placeholder: "Very satisfied", style: ne }) })
        ] });
      case "poll-ranking":
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (a) => o("question", a.target.value), placeholder: "Rank in order of importance", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Items to Rank", children: /* @__PURE__ */ n(
            wt,
            {
              choices: s.choices || ["Item 1", "Item 2", "Item 3"],
              onChange: (a) => o("choices", a)
            }
          ) })
        ] });
      case "poll-matrix": {
        const a = s.rows || ["Item 1", "Item 2", "Item 3"], u = s.columns || ["Poor", "Fair", "Good", "Excellent"];
        return /* @__PURE__ */ n(Y, { children: [
          /* @__PURE__ */ n(N, { label: "Question", children: /* @__PURE__ */ n("textarea", { value: s.question || "", onInput: (d) => o("question", d.target.value), placeholder: "Please rate the following", rows: 3, style: Te }) }),
          /* @__PURE__ */ n(N, { label: "Rows", children: [
            a.map((d, h) => /* @__PURE__ */ n("div", { style: { display: "flex", gap: "4px", marginBottom: "4px" }, children: [
              /* @__PURE__ */ n(
                "input",
                {
                  type: "text",
                  value: d,
                  onInput: (c) => {
                    const p = [...a];
                    p[h] = c.target.value, o("rows", p);
                  },
                  style: { ...ne, flex: 1 },
                  placeholder: `Row ${h + 1}`
                }
              ),
              /* @__PURE__ */ n("button", { onClick: () => o("rows", a.filter((c, p) => p !== h)), style: { padding: "0 8px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fff1f2", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem" }, children: "✕" })
            ] }, h)),
            /* @__PURE__ */ n("button", { onClick: () => o("rows", [...a, ""]), style: { fontSize: "0.72rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: q, fontWeight: 600, padding: 0 }, children: "⊕ Add row" })
          ] }),
          /* @__PURE__ */ n(N, { label: "Columns", children: [
            u.map((d, h) => /* @__PURE__ */ n("div", { style: { display: "flex", gap: "4px", marginBottom: "4px" }, children: [
              /* @__PURE__ */ n(
                "input",
                {
                  type: "text",
                  value: d,
                  onInput: (c) => {
                    const p = [...u];
                    p[h] = c.target.value, o("columns", p);
                  },
                  style: { ...ne, flex: 1 },
                  placeholder: `Column ${h + 1}`
                }
              ),
              /* @__PURE__ */ n("button", { onClick: () => o("columns", u.filter((c, p) => p !== h)), style: { padding: "0 8px", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fff1f2", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem" }, children: "✕" })
            ] }, h)),
            /* @__PURE__ */ n("button", { onClick: () => o("columns", [...u, ""]), style: { fontSize: "0.72rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontFamily: q, fontWeight: 600, padding: 0 }, children: "⊕ Add column" })
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
    fontFamily: q
  }, children: [
    /* @__PURE__ */ n("div", { style: { padding: "1.25rem 1rem", borderBottom: "1px solid #e2e8f0" }, children: [
      /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }, children: [
        "Edit ",
        Is[t.type] || t.type
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
            fontFamily: q
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
            fontFamily: q
          },
          children: "Done"
        }
      )
    ] })
  ] });
}
const Rs = {
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
function qt(t, e = !1) {
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
    fontFamily: q
  };
}
const kt = () => {
};
function Os(t) {
  if (t.blocks && t.blocks.length > 0) return t.blocks;
  const e = [], i = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return t.title && e.push({ id: i(), type: "text", settings: { content: t.title, themeStyle: "title" } }), t.description && e.push({ id: i(), type: "text", settings: { content: t.description, themeStyle: "body" } }), t.body && e.push({ id: i(), type: "text", settings: { content: t.body, themeStyle: "body" } }), t.buttonContent && e.push({ id: i(), type: "button", settings: { label: t.buttonContent, action: "next" } }), e;
}
function As({ initialContent: t, onSave: e, onClose: i, onPreview: r, stepLabel: s, surveyMode: o }) {
  const l = (() => {
    try {
      return JSON.parse(t || "{}");
    } catch {
      return {};
    }
  })(), [a, u] = x(Os(l)), [d, h] = x(null), c = a.find((b) => b.id === d) ?? null, p = (b) => {
    const E = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: b,
      settings: { ...Rs[b] }
    };
    u((k) => [...k, E]), h(E.id);
  }, f = (b, E) => {
    u((k) => k.map((z) => z.id === b ? { ...z, settings: E } : z));
  }, y = (b) => {
    u((E) => E.filter((k) => k.id !== b)), d === b && h(null);
  }, v = (b, E) => {
    const k = b + E;
    u((z) => {
      if (k < 0 || k >= z.length) return z;
      const W = [...z];
      return [W[b], W[k]] = [W[k], W[b]], W;
    });
  }, O = () => {
    const b = { blocks: a };
    return l.layout && (b.layout = l.layout), JSON.stringify(b);
  }, C = () => {
    e(O());
  }, w = () => {
    r && r(O(), o ? "survey" : void 0);
  };
  return /* @__PURE__ */ n("div", { style: {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    display: "flex",
    background: "#F8FAFC",
    fontFamily: q
  }, children: [
    /* @__PURE__ */ n(ks, { onAddBlock: p, onClose: i }),
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
        /* @__PURE__ */ n("h1", { style: { fontSize: "1.4rem", fontWeight: 700, color: "#222", margin: 0, letterSpacing: "-0.03em" }, children: s ? `Editing: ${s}` : "Design your guide step" }),
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
        ] }) : a.map((b, E) => {
          const k = d === b.id;
          return /* @__PURE__ */ n(
            "div",
            {
              onClick: () => h(b.id),
              style: {
                position: "relative",
                borderRadius: "0.5rem",
                border: k ? "2px solid #3b82f6" : "2px solid transparent",
                background: k ? "rgba(59,130,246,0.03)" : "transparent",
                cursor: "pointer",
                transition: "border-color 0.15s",
                padding: "4px",
                marginBottom: "4px"
              },
              children: [
                k && /* @__PURE__ */ n("div", { style: {
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  display: "flex",
                  gap: "4px",
                  zIndex: 10
                }, children: [
                  /* @__PURE__ */ n("button", { onClick: (z) => {
                    z.stopPropagation(), v(E, -1);
                  }, style: qt(E === 0), title: "Move up", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-up", style: { fontSize: "14px" } }) }),
                  /* @__PURE__ */ n("button", { onClick: (z) => {
                    z.stopPropagation(), v(E, 1);
                  }, style: qt(E === a.length - 1), title: "Move down", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-down", style: { fontSize: "14px" } }) }),
                  /* @__PURE__ */ n("button", { onClick: (z) => {
                    z.stopPropagation(), y(b.id);
                  }, style: qt(!1, !0), title: "Delete", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:trash-can-outline", style: { fontSize: "14px" } }) })
                ] }),
                /* @__PURE__ */ n("div", { style: { pointerEvents: "none" }, children: /* @__PURE__ */ n(
                  Ut,
                  {
                    block: b,
                    onNext: kt,
                    onBack: kt,
                    onDismiss: kt,
                    onAction: kt,
                    isFirstStep: !0,
                    isLastStep: !0,
                    surveyMode: o
                  }
                ) })
              ]
            },
            b.id
          );
        }) })
      ] }),
      /* @__PURE__ */ n("div", { style: { marginTop: "2rem", display: "flex", gap: "0.75rem", zIndex: 10, position: "relative" }, children: [
        r && /* @__PURE__ */ n(
          "button",
          {
            onClick: w,
            style: {
              padding: "0.75rem 2rem",
              background: "#fff",
              color: "#1855BC",
              border: "2px solid #1855BC",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              fontFamily: q,
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
            onClick: C,
            style: {
              padding: "0.75rem 3rem",
              background: "#1855BC",
              color: "#fff",
              border: "none",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              fontFamily: q,
              boxShadow: "0 10px 20px rgba(24,85,188,0.2)"
            },
            children: "Save Template"
          }
        )
      ] })
    ] }),
    c && /* @__PURE__ */ n(
      Ts,
      {
        block: c,
        onUpdate: f,
        onCancel: () => h(null),
        onDone: () => h(null)
      }
    )
  ] });
}
const Vt = "https://devgw.revgain.ai/rg-pex";
function Vn() {
  if (typeof window > "u")
    return { baseUrl: Vt, accessToken: "", iud: "", rcid: "", schema: "", role: "" };
  try {
    const t = localStorage.getItem("customerDetails") ? JSON.parse(localStorage.getItem("customerDetails")) : null, e = localStorage.getItem("RGAuth") ? JSON.parse(localStorage.getItem("RGAuth")) : null, i = localStorage.getItem("selectedViewUser") ? JSON.parse(localStorage.getItem("selectedViewUser")) : null, r = t?.BASE_API_URL_MAIN ? `${t.BASE_API_URL_MAIN}/rg-pex` : Vt, s = localStorage.getItem("access_token") || "", o = i?.id || e?.email || "", l = t?.RG_CUSTOMER_ID || "", a = t?.CUSTOMER_SCHEMA || "", u = i?.role || i?.manager_role, d = sessionStorage.getItem("RGSelectedRole");
    let h;
    u ? h = [u] : d ? h = [d] : h = e?.realm_access?.roles || [];
    const c = h.map((p) => p.replace(/\s+/g, "_")).join(",");
    return { baseUrl: r, accessToken: s, iud: o, rcid: l, schema: a, role: c };
  } catch {
    return { baseUrl: Vt, accessToken: "", iud: "", rcid: "", schema: "", role: "" };
  }
}
function It(t) {
  const { accessToken: e, iud: i, rcid: r, schema: s, role: o } = Vn();
  return {
    "Content-Type": "application/json",
    ...e && { Authorization: `Bearer ${e}` },
    ...o && { role: o },
    ...i && { iud: i },
    ...r && { rcid: r },
    ...s && { schema: s },
    ...t
  };
}
const Ps = "designerIud", Se = {
  get baseUrl() {
    return Vn().baseUrl;
  },
  async get(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(i, {
      ...e,
      headers: { ...It(), ...e?.headers }
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async post(t, e, i) {
    const r = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, s = await fetch(r, {
      method: "POST",
      ...i,
      headers: { ...It(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!s.ok) throw new Error(`API error: ${s.status} ${s.statusText}`);
    return s.json();
  },
  async put(t, e, i) {
    const r = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, s = await fetch(r, {
      method: "PUT",
      ...i,
      headers: { ...It(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!s.ok) throw new Error(`API error: ${s.status} ${s.statusText}`);
    return s.json();
  },
  async delete(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(i, {
      method: "DELETE",
      ...e,
      headers: { ...It(), ...e?.headers }
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  }
}, jn = (t) => ["guides", "byId", t];
async function Fs(t) {
  const e = new URLSearchParams({ guide_id: t });
  return Se.get(`/guides?${e.toString()}`);
}
function Ls(t) {
  return Bt({
    queryKey: jn(t),
    queryFn: () => Fs(t),
    enabled: !!t,
    retry: 0
  });
}
const zs = ["guides", "update"];
async function Ds({
  guideId: t,
  payload: e
}) {
  return Se.put(`/guides/${t}`, e);
}
function Ns() {
  const t = _t();
  return it({
    mutationKey: zs,
    mutationFn: Ds,
    onSuccess: (e, i) => {
      t.invalidateQueries({ queryKey: jn(i.guideId) });
    }
  });
}
const Ms = [
  "top-left",
  "top",
  "top-right",
  null,
  "center",
  null,
  "bottom-left",
  "bottom",
  "bottom-right"
], Us = {
  "top-left": "↖",
  top: "↑",
  "top-right": "↗",
  center: "●",
  "bottom-left": "↙",
  bottom: "↓",
  "bottom-right": "↘"
}, un = {
  "top-left": "Top Left",
  top: "Top",
  "top-right": "Top Right",
  center: "Center",
  "bottom-left": "Bottom Left",
  bottom: "Bottom",
  "bottom-right": "Bottom Right"
}, Bs = [
  { value: "draft", label: "Draft", bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1", icon: "mdi:pencil-outline" },
  { value: "active", label: "Active", bg: "#dcfce7", color: "#16a34a", border: "#86efac", icon: "mdi:check-circle-outline" },
  { value: "inactive", label: "Inactive", bg: "#fef9c3", color: "#ca8a04", border: "#fde047", icon: "mdi:pause-circle-outline" },
  { value: "archived", label: "Archived", bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", icon: "mdi:archive-outline" }
];
function Ws({
  onMessage: t,
  elementSelected: e,
  guideId: i = null,
  templateId: r = null
}) {
  const [s, o] = x(""), [l, a] = x(void 0), [u, d] = x(null), [h, c] = x(""), [p, f] = x(null), [y, v] = x(!1), [O, C] = x("on_click"), [w, b] = x(null), [E, k] = x(!1), [z, W] = x(!1), [D, V] = x("anchored"), [K, U] = x("modal"), [Z, X] = x("center"), [we, oe] = x("top"), [Fe, Oe] = x(null), [Le, ue] = x(!1), [ve, he] = x(!1), [Ue, xe] = x(!1), [ze, ae] = x(!1), [$e, ge] = x("draft"), Ae = mr(null), { data: Ee, isLoading: Ce } = Ls(i), I = Ee?.data, P = Me(() => I ? I.templates && I.templates.length > 0 ? I.templates : I.steps || [] : [], [I]), J = Ns(), me = Me(
    () => [...P].sort((_, A) => _.step_order - A.step_order),
    [P]
  ), j = Me(() => p ? P.find((_) => _.map_id === p) : null, [p, P]), De = Me(
    () => me.findIndex((_) => _.map_id === p),
    [me, p]
  ), le = (_) => {
    try {
      const A = JSON.parse(ke(_) || "{}");
      return A.title || A.blocks?.[0]?.settings?.content?.slice(0, 24) || _.template.title || "";
    } catch {
      return _.template.title || "";
    }
  };
  ce(() => {
    if (P.length === 0) return;
    if (r) {
      const A = P.find((H) => H.template_id === r);
      A && f(A.map_id);
      return;
    }
    if (Ae.current) {
      const A = P.find((H) => H.template_id === Ae.current);
      if (Ae.current = null, A) {
        f(A.map_id);
        return;
      }
    }
    const _ = P.some((A) => A.map_id === p);
    (!p || !_) && f(P[0].map_id);
  }, [P, r]), ce(() => {
    if (I) {
      C(I.target_segment ? "on_click" : "automatic");
      const _ = I.status;
      (_ === "draft" || _ === "active" || _ === "inactive" || _ === "archived") && ge(_);
    }
  }, [I]), ce(() => {
    if (Oe(null), j) {
      W(j.auto_click_target ?? !1), V(j.x_path ? "anchored" : "floating");
      try {
        const _ = JSON.parse(ke(j) || "{}"), A = _.layout?.renderAs, H = _.layout?.position;
        A === "banner" ? (U("banner"), oe(H === "bottom" ? "bottom" : "top")) : (U("modal"), X(H ?? "center"));
      } catch {
        U("modal"), X("center");
      }
    } else
      W(!1), X("center"), V("floating");
  }, [j, i]), ce(() => {
    t({ type: "EDITOR_READY" });
  }, []), ce(() => {
    e ? y ? b({
      selector: e.selector,
      xpath: e.xpath,
      elementInfo: e.elementInfo
    }) : (o(e.selector), a(e.xpath), d(e.elementInfo), c("")) : y && b(null);
  }, [e, y]);
  const Ve = () => {
    k(!1), o(""), a(void 0), d(null), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, S = () => {
    k(!1), o(""), a(void 0), d(null), V("floating"), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, te = () => {
    k(!1), o(""), a(void 0), d(null), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, pe = (_, A) => {
    try {
      const H = JSON.parse(_ || "{}");
      return A && (H.layout || (H.layout = {}), K === "banner" ? (H.layout.renderAs = "banner", H.layout.position = we) : (H.layout.renderAs = "modal", H.layout.position = Z)), JSON.stringify(H);
    } catch {
      return A ? JSON.stringify({ layout: K === "banner" ? { renderAs: "banner", position: we } : { renderAs: "modal", position: Z } }) : _;
    }
  }, nt = async () => {
    if (!I || !i) return;
    const _ = Je();
    l ?? (s && (s.startsWith("/") || s.startsWith("//")));
    const A = P.slice().sort((ie, B) => ie.step_order - B.step_order).map((ie) => {
      const B = ie.map_id === p;
      let fe = ie.x_path;
      B && (fe = D === "floating" ? null : l || s || ie.x_path);
      const je = !fe, bt = B ? Fe ?? ke(ie) : ke(ie);
      return {
        template_id: ie.template_id,
        step_order: ie.step_order,
        url: B ? _ : ie.url ?? _,
        x_path: fe,
        auto_click_target: B ? z : ie.auto_click_target ?? !1,
        content: B ? pe(bt, je) : bt
      };
    }), H = {
      guide_name: I.guide_name ?? "",
      description: I.description ?? "",
      target_segment: I.target_segment ?? null,
      guide_category: I.guide_category ?? null,
      target_page: I.target_page ?? _,
      type: I.type ?? "modal",
      trigger_type: O === "automatic" ? "page_load" : "click",
      status: I.status ?? "draft",
      priority: I.priority ?? 0,
      templates: A
    };
    c(""), Ae.current = j?.template_id ?? null;
    try {
      await J.mutateAsync({ guideId: i, payload: H }), te(), he(!0), setTimeout(() => he(!1), 2e3);
    } catch (ie) {
      Ae.current = null;
      const B = ie instanceof Error ? ie.message : "Failed to update guide";
      c(B);
    }
  }, G = async () => {
    if (!I || !i) return;
    const _ = Je(), A = O === "automatic" ? null : w?.xpath ?? (w?.selector?.startsWith("/") || w?.selector?.startsWith("//") ? w?.selector : null) ?? null, H = P.slice().sort((B, fe) => B.step_order - fe.step_order).map((B) => {
      const fe = B.map_id === p;
      let je = B.x_path;
      fe && (je = D === "floating" ? null : l || s || B.x_path);
      const bt = !je;
      return {
        template_id: B.template_id,
        step_order: B.step_order,
        url: fe ? _ : B.url ?? _,
        x_path: je,
        auto_click_target: fe ? z : B.auto_click_target ?? !1,
        content: fe ? pe(ke(B), bt) : ke(B)
      };
    }), ie = {
      guide_name: I.guide_name ?? "",
      description: I.description ?? "",
      target_segment: A,
      guide_category: I.guide_category ?? null,
      target_page: _,
      type: I.type ?? "modal",
      trigger_type: O === "automatic" ? "page_load" : "click",
      status: I.status ?? "draft",
      priority: I.priority ?? 0,
      templates: H
    };
    c("");
    try {
      await J.mutateAsync({ guideId: i, payload: ie }), te(), xe(!0), setTimeout(() => {
        xe(!1), v(!1);
      }, 1200);
    } catch (B) {
      const fe = B instanceof Error ? B.message : "Failed to update guide";
      c(fe);
    }
  }, L = async (_) => {
    if (!I || !i) return;
    const A = Je(), H = P.slice().sort((B, fe) => B.step_order - fe.step_order).map((B) => ({
      template_id: B.template_id,
      step_order: B.step_order,
      url: B.url ?? A,
      x_path: B.x_path,
      auto_click_target: B.auto_click_target ?? !1,
      content: ke(B)
    })), ie = {
      guide_name: I.guide_name ?? "",
      description: I.description ?? "",
      target_segment: I.target_segment ?? null,
      guide_category: I.guide_category ?? null,
      target_page: I.target_page ?? A,
      type: I.type ?? "modal",
      trigger_type: I.trigger_type ?? null,
      status: _,
      priority: I.priority ?? 0,
      templates: H
    };
    ge(_), c("");
    try {
      await J.mutateAsync({ guideId: i, payload: ie }), ae(!0), setTimeout(() => ae(!1), 2e3);
    } catch (B) {
      const fe = I.status;
      ge(["draft", "active", "inactive", "archived"].includes(fe) ? fe : "draft");
      const je = B instanceof Error ? B.message : "Failed to update status";
      c(je);
    }
  }, T = !!i && !!I, F = l || s || j?.x_path || "", ye = w?.xpath ?? w?.selector ?? "";
  return /* @__PURE__ */ n("div", { style: m.root, children: [
    Le && j && /* @__PURE__ */ n(
      As,
      {
        initialContent: Fe ?? ke(j),
        stepLabel: le(j) || `Step ${De + 1}`,
        surveyMode: I?.type === "survey",
        onSave: (_) => {
          Oe(_), ue(!1), t({ type: "COLLAPSE_FROM_FULLSCREEN" });
        },
        onClose: () => {
          ue(!1), t({ type: "COLLAPSE_FROM_FULLSCREEN" });
        },
        onPreview: (_, A) => {
          t({
            type: "PREVIEW_CONTENT",
            content: pe(_, D === "floating"),
            xpath: K === "banner" ? null : l || j.x_path || null,
            layoutMode: K === "banner" ? "floating" : D,
            position: K === "banner" ? we : Z,
            guideType: A || I?.type
          });
        }
      }
    ),
    /* @__PURE__ */ n("div", { style: m.header, children: [
      /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.25rem" }, children: [
        /* @__PURE__ */ n("h2", { style: m.headerTitle, children: y ? "Configure Trigger" : T ? I?.guide_name ?? "Guide" : "Create Guide" }),
        y && I?.guide_name && /* @__PURE__ */ n("span", { style: { fontSize: "0.75rem", color: "#94a3b8" }, children: [
          'for "',
          I.guide_name,
          '"'
        ] })
      ] }),
      /* @__PURE__ */ n($, { variant: "icon", onClick: () => t({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    y ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ n(
        $,
        {
          variant: "secondary",
          style: { alignSelf: "flex-start" },
          onClick: () => {
            k(!1), v(!1), b(null), t({ type: "CLEAR_SELECTION_CLICKED" });
          },
          children: [
            /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left", style: { marginRight: "0.4rem" } }),
            "Back to Steps"
          ]
        }
      ),
      I?.target_segment && /* @__PURE__ */ n("div", { style: m.section, children: [
        /* @__PURE__ */ n("label", { style: m.label, children: "Currently triggers on" }),
        /* @__PURE__ */ n("div", { style: {
          ...m.selectorBox,
          marginTop: "0.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:cursor-default-click", style: { fontSize: "0.9rem", color: "#3b82f6", flexShrink: 0 } }),
          /* @__PURE__ */ n("span", { title: I.target_segment, style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: I.target_segment.length > 55 ? I.target_segment.slice(0, 55) + "…" : I.target_segment })
        ] })
      ] }),
      /* @__PURE__ */ n("div", { style: m.section, children: [
        /* @__PURE__ */ n("label", { style: m.label, children: "When should this guide appear?" }),
        /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }, children: ["automatic", "on_click"].map((_) => {
          const A = O === _;
          return /* @__PURE__ */ n(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: A ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                background: A ? "rgba(59,130,246,0.05)" : "#fff",
                cursor: "pointer"
              },
              children: [
                /* @__PURE__ */ n(
                  "input",
                  {
                    type: "radio",
                    name: "triggerAction",
                    value: _,
                    checked: A,
                    onChange: () => C(_),
                    style: { marginTop: "0.1rem", accentColor: "#3b82f6" }
                  }
                ),
                /* @__PURE__ */ n("div", { children: [
                  /* @__PURE__ */ n("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }, children: _ === "automatic" ? "On page load" : "When an element is clicked" }),
                  /* @__PURE__ */ n("div", { style: { fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.125rem" }, children: _ === "automatic" ? "Guide appears automatically when the page loads" : "Guide appears when a specific element is clicked" })
                ] })
              ]
            },
            _
          );
        }) })
      ] }),
      O === "on_click" && /* @__PURE__ */ n("div", { style: m.section, children: [
        /* @__PURE__ */ n("label", { style: m.label, children: "Which element triggers this guide?" }),
        w ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }, children: [
          /* @__PURE__ */ n("div", { style: {
            padding: "0.75rem",
            border: "1px solid #bbf7d0",
            borderRadius: "0.75rem",
            background: "#f0fdf4"
          }, children: [
            /* @__PURE__ */ n("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#166534" }, children: [
              w.elementInfo?.tagName?.toLowerCase() ?? "element",
              w.elementInfo?.textContent && /* @__PURE__ */ n("span", { style: { fontWeight: 400, color: "#15803d" }, children: [
                " ",
                '· "',
                w.elementInfo.textContent.slice(0, 30),
                '"'
              ] })
            ] }),
            w.elementInfo?.id && /* @__PURE__ */ n("div", { style: { fontSize: "0.7rem", color: "#4ade80", marginTop: "0.125rem" }, children: [
              "#",
              w.elementInfo.id
            ] }),
            /* @__PURE__ */ n("div", { style: { marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#86efac", wordBreak: "break-all" }, children: [
              ye.slice(0, 60),
              ye.length > 60 ? "…" : ""
            ] })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem" }, children: [
            /* @__PURE__ */ n(
              $,
              {
                variant: "secondary",
                style: { flex: 1 },
                onClick: () => {
                  k(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: [
                  /* @__PURE__ */ n("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.3rem" } }),
                  "Change"
                ]
              }
            ),
            E && /* @__PURE__ */ n(
              $,
              {
                variant: "secondary",
                onClick: () => {
                  k(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Done"
              }
            ),
            I?.target_segment && /* @__PURE__ */ n(
              $,
              {
                variant: "secondary",
                style: { borderColor: "#fca5a5", color: "#dc2626" },
                onClick: () => {
                  k(!1), b(null), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Clear"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ n(
          $,
          {
            variant: E ? "primary" : "secondary",
            style: { marginTop: "0.25rem" },
            onClick: () => {
              k(!0), t({ type: "ACTIVATE_SELECTOR" });
            },
            children: [
              /* @__PURE__ */ n("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.4rem" } }),
              E ? "Click an element on the page…" : "Select element"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ n("div", { style: { ...m.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ n(
        $,
        {
          variant: "primary",
          style: { flex: 1 },
          onClick: G,
          disabled: J.isPending || Ue,
          children: J.isPending ? "Saving…" : Ue ? "✓ Trigger saved" : "Save Trigger"
        }
      ) }),
      h && /* @__PURE__ */ n("div", { style: m.errorBox, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle" }),
        h
      ] })
    ] }) : (
      /* ── Main Step Editor ── */
      /* @__PURE__ */ n(Y, { children: i && Ce ? /* @__PURE__ */ n("div", { style: { ...m.emptyState, padding: "2rem" }, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "2rem", color: "#3b82f6" } }),
        /* @__PURE__ */ n("p", { style: m.emptyStateText, children: "Loading guide…" })
      ] }) : i && !I ? /* @__PURE__ */ n("div", { style: { ...m.emptyState, padding: "2rem" }, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle", style: { fontSize: "2rem", color: "#94a3b8" } }),
        /* @__PURE__ */ n("p", { style: m.emptyStateText, children: "Guide not found." })
      ] }) : T && me.length > 0 ? /* @__PURE__ */ n(Y, { children: [
        /* @__PURE__ */ n("div", { style: m.section, children: [
          /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ n("label", { style: m.label, children: "Steps" }),
            /* @__PURE__ */ n("span", { style: { fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }, children: [
              De + 1,
              " of ",
              me.length
            ] })
          ] }),
          /* @__PURE__ */ n("div", { style: {
            display: "flex",
            gap: "0.4rem",
            overflowX: "auto",
            paddingBottom: "0.25rem",
            marginTop: "0.4rem"
          }, children: me.map((_, A) => {
            const H = p === _.map_id, ie = le(_) || `Step ${A + 1}`;
            return /* @__PURE__ */ n(
              "button",
              {
                onClick: () => f(_.map_id),
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "9999px",
                  border: H ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  background: H ? "rgba(59,130,246,0.08)" : "#f8fafc",
                  color: H ? "#1d4ed8" : "#64748b",
                  fontSize: "0.78rem",
                  fontWeight: H ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontFamily: m.root.fontFamily
                },
                children: [
                  /* @__PURE__ */ n("span", { style: { opacity: 0.55, fontSize: "0.7rem" }, children: A + 1 }),
                  ie.length > 20 ? ie.slice(0, 20) + "…" : ie
                ]
              },
              _.map_id
            );
          }) })
        ] }),
        /* @__PURE__ */ n("div", { style: m.section, children: [
          /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [
            /* @__PURE__ */ n("label", { style: m.label, children: "Guide Status" }),
            ze && /* @__PURE__ */ n("span", { style: { fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }, children: "✓ Saved" })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.4rem" }, children: Bs.map((_) => {
            const A = $e === _.value;
            return /* @__PURE__ */ n(
              "button",
              {
                onClick: () => L(_.value),
                disabled: J.isPending,
                style: {
                  flex: 1,
                  padding: "0.5rem 0.25rem",
                  borderRadius: "0.625rem",
                  border: `2px solid ${A ? _.border : "#e2e8f0"}`,
                  background: A ? _.bg : "#f8fafc",
                  color: A ? _.color : "#94a3b8",
                  fontSize: "0.72rem",
                  fontWeight: A ? 700 : 500,
                  cursor: J.isPending ? "not-allowed" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.2rem",
                  transition: "all 0.15s",
                  fontFamily: m.root.fontFamily,
                  opacity: J.isPending ? 0.6 : 1
                },
                children: [
                  /* @__PURE__ */ n("iconify-icon", { icon: _.icon, style: { fontSize: "1rem" } }),
                  _.label
                ]
              },
              _.value
            );
          }) })
        ] }),
        /* @__PURE__ */ n("div", { style: m.section, children: [
          /* @__PURE__ */ n("label", { style: m.label, children: "Content" }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem" }, children: [
            /* @__PURE__ */ n(
              $,
              {
                variant: "secondary",
                style: { flex: 1 },
                onClick: () => {
                  t({ type: "EXPAND_TO_FULLSCREEN" }), ue(!0);
                },
                children: [
                  /* @__PURE__ */ n("iconify-icon", { icon: "mdi:pencil-outline", style: { marginRight: "0.4rem" } }),
                  "Edit Content"
                ]
              }
            ),
            /* @__PURE__ */ n(
              $,
              {
                variant: "secondary",
                style: { flexShrink: 0 },
                onClick: () => {
                  if (!j) return;
                  const _ = Fe ?? ke(j);
                  t({
                    type: "PREVIEW_CONTENT",
                    content: pe(_, D === "floating"),
                    xpath: K === "banner" ? null : l || j.x_path || null,
                    layoutMode: K === "banner" ? "floating" : D,
                    position: K === "banner" ? we : Z,
                    guideType: I?.type
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
          Fe && /* @__PURE__ */ n("div", { style: {
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
          /* @__PURE__ */ n("div", { style: m.section, children: [
            /* @__PURE__ */ n("label", { style: m.label, children: "Layout" }),
            /* @__PURE__ */ n(
              "select",
              {
                value: D,
                onChange: (_) => {
                  const A = _.target.value;
                  V(A), A === "floating" ? Ve() : !l && !s && !j?.x_path && (k(!0), t({ type: "ACTIVATE_SELECTOR" }));
                },
                style: {
                  width: "100%",
                  marginTop: "0.25rem",
                  padding: "0.625rem 1rem",
                  fontFamily: m.root.fontFamily,
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
          D === "floating" && /* @__PURE__ */ n("div", { style: m.section, children: [
            /* @__PURE__ */ n("label", { style: m.label, children: "Style" }),
            /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem", marginTop: "0.25rem" }, children: ["modal", "banner"].map((_) => {
              const A = K === _;
              return /* @__PURE__ */ n(
                "button",
                {
                  onClick: () => U(_),
                  style: {
                    flex: 1,
                    padding: "0.6rem",
                    borderRadius: "0.75rem",
                    border: `2px solid ${A ? "#3b82f6" : "#e2e8f0"}`,
                    background: A ? "rgba(59,130,246,0.08)" : "#f8fafc",
                    color: A ? "#1d4ed8" : "#94a3b8",
                    fontSize: "0.78rem",
                    fontWeight: A ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.35rem",
                    fontFamily: m.root.fontFamily,
                    transition: "all 0.15s"
                  },
                  children: [
                    /* @__PURE__ */ n(
                      "iconify-icon",
                      {
                        icon: _ === "modal" ? "mdi:card-outline" : "mdi:dock-top",
                        style: { fontSize: "1rem" }
                      }
                    ),
                    _ === "modal" ? "Modal" : "Banner"
                  ]
                },
                _
              );
            }) })
          ] }),
          D === "anchored" ? (
            /* ── Anchored: element picker ── */
            /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
              /* @__PURE__ */ n("label", { style: m.label, children: "Target Element" }),
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
                    /* @__PURE__ */ n("div", { style: { marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#94a3b8", wordBreak: "break-all" }, children: F.length > 60 ? F.slice(0, 60) + "…" : F })
                  ] }),
                  /* @__PURE__ */ n(
                    "button",
                    {
                      onClick: te,
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
                        fontFamily: m.root.fontFamily
                      },
                      children: [
                        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "0.68rem" } }),
                        "Cancel"
                      ]
                    }
                  )
                ] }) })
              ) : j?.x_path ? (
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
                        onClick: S,
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
                          fontFamily: m.root.fontFamily
                        },
                        children: [
                          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:close", style: { fontSize: "0.7rem" } }),
                          "Clear"
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("div", { style: { marginTop: "0.35rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#94a3b8", wordBreak: "break-all" }, children: j.x_path.length > 60 ? j.x_path.slice(0, 60) + "…" : j.x_path })
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
                    onClick: () => W(!z),
                    style: m.toggle(z),
                    "aria-label": "Toggle auto-click",
                    children: /* @__PURE__ */ n("div", { style: m.toggleThumb(z) })
                  }
                )
              ] }),
              /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem" }, children: [
                /* @__PURE__ */ n(
                  $,
                  {
                    variant: E ? "primary" : "secondary",
                    style: { flex: 1 },
                    onClick: () => {
                      k(!0), t({ type: "ACTIVATE_SELECTOR" });
                    },
                    children: [
                      /* @__PURE__ */ n("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.3rem" } }),
                      F ? "Change Element" : "Select Element"
                    ]
                  }
                ),
                E && /* @__PURE__ */ n(
                  $,
                  {
                    variant: "secondary",
                    onClick: () => {
                      k(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                    },
                    children: "Done"
                  }
                )
              ] })
            ] })
          ) : K === "modal" ? (
            /* ── Floating Modal: 3×3 position grid ── */
            /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
              /* @__PURE__ */ n("label", { style: m.label, children: "Position on screen" }),
              /* @__PURE__ */ n("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", marginTop: "0.25rem" }, children: Ms.map((_, A) => {
                if (!_)
                  return /* @__PURE__ */ n("div", {}, A);
                const H = Z === _;
                return /* @__PURE__ */ n(
                  "button",
                  {
                    onClick: () => X(_),
                    title: un[_],
                    style: {
                      aspectRatio: "1.4 / 1",
                      borderRadius: "0.6rem",
                      border: H ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      background: H ? "rgba(59,130,246,0.08)" : "#f8fafc",
                      color: H ? "#1d4ed8" : "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.15rem",
                      fontFamily: m.root.fontFamily,
                      transition: "all 0.15s"
                    },
                    children: [
                      /* @__PURE__ */ n("span", { style: { fontSize: "1rem", lineHeight: 1 }, children: Us[_] }),
                      /* @__PURE__ */ n("span", { style: { fontSize: "0.6rem", fontWeight: H ? 700 : 500 }, children: un[_] })
                    ]
                  },
                  _
                );
              }) })
            ] })
          ) : (
            /* ── Floating Banner: top / bottom picker ── */
            /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
              /* @__PURE__ */ n("label", { style: m.label, children: "Banner position" }),
              /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.5rem", marginTop: "0.25rem" }, children: ["top", "bottom"].map((_) => {
                const A = we === _;
                return /* @__PURE__ */ n(
                  "button",
                  {
                    onClick: () => oe(_),
                    style: {
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "0.75rem",
                      border: `2px solid ${A ? "#3b82f6" : "#e2e8f0"}`,
                      background: A ? "rgba(59,130,246,0.08)" : "#f8fafc",
                      color: A ? "#1d4ed8" : "#94a3b8",
                      fontSize: "0.78rem",
                      fontWeight: A ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                      fontFamily: m.root.fontFamily,
                      transition: "all 0.15s"
                    },
                    children: [
                      /* @__PURE__ */ n(
                        "iconify-icon",
                        {
                          icon: _ === "top" ? "mdi:dock-top" : "mdi:dock-bottom",
                          style: { fontSize: "1rem" }
                        }
                      ),
                      _ === "top" ? "Top" : "Bottom"
                    ]
                  },
                  _
                );
              }) })
            ] })
          ),
          /* @__PURE__ */ n("div", { style: { marginTop: "0.25rem" }, children: /* @__PURE__ */ n(
            $,
            {
              variant: "primary",
              style: { width: "100%", height: "42px" },
              onClick: nt,
              disabled: J.isPending || ve,
              children: J.isPending ? "Saving…" : ve ? "✓ Step saved" : "Save Step"
            }
          ) })
        ] }),
        /* @__PURE__ */ n("div", { style: m.actionRow, children: /* @__PURE__ */ n(
          $,
          {
            variant: "secondary",
            style: { flex: 1 },
            onClick: () => v(!0),
            children: [
              /* @__PURE__ */ n("iconify-icon", { icon: "mdi:lightning-bolt", style: { marginRight: "0.4rem", color: "#f59e0b" } }),
              "Set Trigger"
            ]
          }
        ) }),
        h && /* @__PURE__ */ n("div", { style: m.errorBox, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle" }),
          h
        ] })
      ] }) : null })
    )
  ] });
}
function ct({
  type: t = "text",
  value: e,
  onInput: i,
  placeholder: r,
  id: s,
  style: o,
  disabled: l,
  "aria-label": a
}) {
  const u = o ? { ...m.input, ...o } : m.input;
  return /* @__PURE__ */ n(
    "input",
    {
      type: t,
      value: e,
      onInput: i,
      placeholder: r,
      id: s,
      style: u,
      disabled: l,
      "aria-label": a
    }
  );
}
function Qn({
  value: t,
  onInput: e,
  placeholder: i,
  id: r,
  minHeight: s,
  style: o,
  disabled: l,
  "aria-label": a
}) {
  const u = o ? { ...m.textarea, ...o, ...s != null && { minHeight: typeof s == "number" ? `${s}px` : s } } : s != null ? { ...m.textarea, minHeight: typeof s == "number" ? `${s}px` : s } : m.textarea;
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
const Gs = ["pages", "create"];
async function $s(t) {
  return Se.post("/pages", {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: "active"
  });
}
function Hs() {
  return it({
    mutationKey: Gs,
    mutationFn: $s
  });
}
const qs = ["pages", "update"];
async function Vs({ pageId: t, payload: e }) {
  return Se.put(`/pages/${t}`, {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: e.status ?? "active"
  });
}
function js() {
  return it({
    mutationKey: qs,
    mutationFn: Vs
  });
}
const Qs = ["pages", "delete"];
async function Ks(t) {
  return Se.delete(`/pages/${t}`);
}
function Ys() {
  return it({
    mutationKey: Qs,
    mutationFn: Ks
  });
}
const Xs = (t) => ["pages", "check-slug", t];
async function Js(t) {
  return Se.get(`/pages/check-slug?slug=${encodeURIComponent(t)}`);
}
function Zs(t) {
  return Bt({
    queryKey: Xs(t),
    queryFn: () => Js(t),
    enabled: !!t,
    retry: 0
  });
}
const eo = ["pages", "list"];
async function to() {
  return Se.get("/pages");
}
function io() {
  return Bt({
    queryKey: eo,
    queryFn: to,
    retry: 0
  });
}
const no = "designerTaggedPages", Tt = ["pages", "check-slug"], jt = ["pages", "list"];
function Rt() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (e.host || e.hostname || "") + (e.pathname || "/") + (e.search || "") + (e.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function Ot() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (e.pathname || "/").replace(/^\//, ""), r = e.search || "", s = e.hash || "";
    return "//*/" + i + r + s;
  } catch {
    return "//*/";
  }
}
function ro({ onMessage: t }) {
  const [e, i] = x("overviewUntagged"), [r, s] = x(""), [o, l] = x(""), [a, u] = x(""), [d, h] = x(!1), [c, p] = x("create"), [f, y] = x(""), [v, O] = x(""), [C, w] = x("suggested"), [b, E] = x(""), [k, z] = x(!1), [W, D] = x(null), [V, K] = x(!1), U = _t(), Z = Hs(), X = js(), we = Ys(), { data: oe, isLoading: Fe, isError: Oe } = Zs(r), { data: Le, isLoading: ue } = io(), ve = !!r && Fe, he = Z.isPending || X.isPending, Ue = (r || "").trim().toLowerCase(), ze = (Le?.data ?? []).filter((P) => (P.slug || "").trim().toLowerCase() === Ue).filter(
    (P) => (P.name || "").toLowerCase().includes(a.toLowerCase().trim())
  ), ae = Pe(() => {
    i("overviewUntagged"), l(Rt() || "(current page)"), h(!1), U.invalidateQueries({ queryKey: Tt });
  }, [U]), $e = Pe(() => {
    i("taggedPagesDetailView"), u("");
  }, []), ge = Pe(() => {
    D(null), i("tagPageFormView"), h(!0), E(Ot()), y(""), O(""), p("create"), w("suggested"), z(!1);
  }, []), Ae = Pe((P) => {
    D(P.page_id), i("tagPageFormView"), h(!0), E(P.slug || Ot()), y(P.name || ""), O(P.description || ""), p("create"), w("suggested"), z(!1);
  }, []);
  ce(() => {
    t({ type: "EDITOR_READY" });
  }, []), ce(() => {
    s(Ot()), l(Rt() || "(current page)");
  }, []), ce(() => {
    if (!r) {
      i("overviewUntagged");
      return;
    }
    if (Oe) {
      (e === "overviewTagged" || e === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    oe !== void 0 && (e === "overviewTagged" || e === "overviewUntagged") && i(oe.exists ? "overviewTagged" : "overviewUntagged");
  }, [r, oe, Oe, e]), ce(() => {
    let P = Rt();
    const J = () => {
      const le = Rt();
      le !== P && (P = le, s(Ot()), l(le || "(current page)"), i("overviewUntagged"));
    }, me = () => J(), j = () => J();
    window.addEventListener("hashchange", me), window.addEventListener("popstate", j);
    const De = setInterval(J, 1500);
    return () => {
      window.removeEventListener("hashchange", me), window.removeEventListener("popstate", j), clearInterval(De);
    };
  }, []);
  const Ee = async () => {
    const P = f.trim();
    if (!P) {
      z(!0);
      return;
    }
    z(!1);
    const J = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, me = b.trim() || J || "/";
    try {
      if (W)
        await X.mutateAsync({
          pageId: W,
          payload: {
            name: P,
            slug: me,
            description: v.trim() || void 0,
            status: "active"
          }
        }), D(null), U.invalidateQueries({ queryKey: Tt }), U.invalidateQueries({ queryKey: jt }), ae();
      else {
        const j = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, De = b.trim() || j;
        await Z.mutateAsync({
          name: P,
          slug: me,
          description: v.trim() || void 0
        });
        const le = no, Ve = localStorage.getItem(le) || "[]", S = JSON.parse(Ve);
        S.push({ pageName: P, url: De }), localStorage.setItem(le, JSON.stringify(S)), U.invalidateQueries({ queryKey: Tt }), U.invalidateQueries({ queryKey: jt }), i("overviewTagged"), h(!1);
      }
    } catch {
    }
  }, Ce = async (P) => {
    if (window.confirm("Delete this page?"))
      try {
        await we.mutateAsync(P), U.invalidateQueries({ queryKey: Tt }), U.invalidateQueries({ queryKey: jt });
      } catch {
      }
  }, I = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return V ? /* @__PURE__ */ n("div", { style: { ...m.panel, padding: "0.5rem" }, children: /* @__PURE__ */ n("div", { style: m.panelHeader, children: [
    /* @__PURE__ */ n("h2", { style: { ...m.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ n($, { variant: "icon", title: "Expand", onClick: () => K(!1), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ n("div", { style: m.panel, children: [
    /* @__PURE__ */ n("div", { style: m.panelHeader, children: [
      /* @__PURE__ */ n("h2", { style: { ...m.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ n($, { variant: "icon", title: "Minimize", onClick: () => K(!0), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ n("div", { style: m.panelBody, children: [
      ve && (e === "overviewTagged" || e === "overviewUntagged") && /* @__PURE__ */ n("div", { style: { ...I, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ n("span", { children: "Checking page…" })
      ] }),
      !ve && e === "overviewTagged" && /* @__PURE__ */ n("div", { style: I, children: [
        /* @__PURE__ */ n("div", { style: m.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ n("div", { style: { ...m.card, marginBottom: "1rem", cursor: "pointer" }, onClick: $e, children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ n("span", { style: { ...m.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ n("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: o })
            ] })
          ] }),
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ n($, { variant: "primary", style: { width: "100%" }, onClick: ge, children: "Tag Page" })
      ] }),
      e === "taggedPagesDetailView" && /* @__PURE__ */ n("div", { style: I, children: [
        /* @__PURE__ */ n(
          "a",
          {
            href: "#",
            style: m.link,
            onClick: (P) => {
              P.preventDefault(), ae();
            },
            children: [
              /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ n("span", { style: { ...m.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: ue ? "…" : ze.length }),
          /* @__PURE__ */ n("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ n("div", { style: m.searchWrap, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:magnify", style: m.searchIcon }),
          /* @__PURE__ */ n(
            ct,
            {
              type: "text",
              placeholder: "Search Pages",
              value: a,
              onInput: (P) => u(P.target.value),
              style: m.searchInput
            }
          ),
          a && /* @__PURE__ */ n($, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => u(""), children: "Clear" })
        ] }),
        ue ? /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ n("span", { children: "Loading pages…" })
        ] }) : ze.map((P) => /* @__PURE__ */ n("div", { style: { ...m.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: P.name || "Unnamed" }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ n($, { variant: "iconSm", title: "Edit", onClick: () => Ae(P), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ n($, { variant: "iconSm", title: "Delete", onClick: () => Ce(P.page_id), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, P.page_id)),
        /* @__PURE__ */ n($, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: ge, children: "Tag Page" })
      ] }),
      !ve && e === "overviewUntagged" && /* @__PURE__ */ n("div", { style: { ...I, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ n("div", { style: { ...m.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ n("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ n($, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: ge, children: "Tag Page" })
      ] }),
      e === "tagPageFormView" && /* @__PURE__ */ n("div", { style: { ...I, gap: "1.5rem" }, children: [
        /* @__PURE__ */ n(
          "a",
          {
            href: "#",
            style: m.link,
            onClick: (P) => {
              P.preventDefault(), D(null), ae(), h(!1);
            },
            children: [
              /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back"
            ]
          }
        ),
        /* @__PURE__ */ n("div", { children: [
          /* @__PURE__ */ n("div", { style: m.sectionLabel, children: W ? "EDIT PAGE" : "PAGE SETUP" }),
          !W && /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "pageSetup", value: "create", checked: c === "create", onChange: () => p("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create New Page" })
            ] }),
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
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
                ct,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: f,
                  onInput: (P) => y(P.target.value)
                }
              ),
              k && /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ n("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ n("div", { children: [
              /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ n(
                Qn,
                {
                  placeholder: "Click to add description",
                  value: v,
                  onInput: (P) => O(P.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ n("div", { children: [
          /* @__PURE__ */ n("div", { style: { ...m.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "INCLUDE PAGE RULES",
            /* @__PURE__ */ n("span", { style: { color: "#94a3b8" }, title: "Define how this page is identified", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }, children: [
            /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#334155" }, children: "Include Rule 1" }),
            /* @__PURE__ */ n($, { variant: "iconSm", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "ruleType", value: "suggested", checked: C === "suggested", onChange: () => w("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "ruleType", value: "exact", checked: C === "exact", onChange: () => w("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "ruleType", value: "builder", checked: C === "builder", onChange: () => w("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ n("div", { children: [
            /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ n(ct, { type: "text", placeholder: "e.g. //*/path/to/page", value: b, onInput: (P) => E(P.target.value) })
          ] })
        ] })
      ] })
    ] }),
    d && /* @__PURE__ */ n("div", { style: m.footer, children: [
      /* @__PURE__ */ n(
        $,
        {
          variant: "secondary",
          onClick: () => {
            D(null), ae();
          },
          disabled: he,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ n($, { variant: "primary", style: { flex: 1 }, onClick: Ee, disabled: he, children: he ? /* @__PURE__ */ n(Y, { children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        W ? "Updating…" : "Saving…"
      ] }) : W ? "Update" : "Save" })
    ] })
  ] });
}
const so = ["features", "create"];
async function oo(t) {
  return Se.post("/features", t);
}
function ao() {
  return it({
    mutationKey: so,
    mutationFn: oo
  });
}
const lo = ["features", "update"];
async function co({
  featureId: t,
  payload: e
}) {
  return Se.put(`/features/${t}`, e);
}
function uo() {
  return it({
    mutationKey: lo,
    mutationFn: co
  });
}
const ho = ["features", "delete"];
async function po(t) {
  return Se.delete(`/features/${t}`);
}
function fo() {
  return it({
    mutationKey: ho,
    mutationFn: po
  });
}
const lt = ["features", "list"];
async function mo() {
  const t = await Se.get("/features");
  return Array.isArray(t) ? { data: t } : t;
}
function go() {
  return Bt({
    queryKey: lt,
    queryFn: mo,
    retry: 0
  });
}
const hn = "designerHeatmapEnabled";
function yo({ onMessage: t, elementSelected: e }) {
  const [i, r] = x("overview"), [s, o] = x(!1), [l, a] = x(""), [u, d] = x(null), [h, c] = x(""), [p, f] = x(!1), [y, v] = x(!1), [O, C] = x(!1), [w, b] = x(!1), [E, k] = x(!1), [z, W] = x("create"), [D, V] = x("suggested"), [K, U] = x(""), [Z, X] = x(""), [we, oe] = x(null), [Fe, Oe] = x(null), [Le, ue] = x(""), ve = _t(), he = ao(), Ue = uo(), xe = fo(), { data: ze, isLoading: ae } = go(), $e = he.isPending || Ue.isPending || xe.isPending, ge = ze?.data ?? [], Ae = ge.length, Ee = ge.filter((S) => (S.name || "").toLowerCase().includes(Le.toLowerCase().trim())).sort((S, te) => (S.name || "").localeCompare(te.name || "", void 0, { sensitivity: "base" })), Ce = Pe(() => {
    r("overview"), o(!1), a(""), d(null), X(""), c(""), f(!1), oe(null), ue(""), ve.invalidateQueries({ queryKey: lt });
  }, [ve]), I = Pe(() => {
    r("taggedList"), ue("");
  }, []), P = Pe((S) => S.rules?.find(
    (pe) => pe.selector_type === "xpath" && (pe.selector_value ?? "").trim() !== ""
  )?.selector_value ?? "", []), J = Pe(
    (S) => {
      r("form"), o(!0), S ? (oe(S.feature_id), c(S.name || ""), U(S.description || ""), X(P(S)), V("exact")) : (oe(null), c(""), U(""), X(e?.xpath || ""), a(e?.selector || ""), d(e?.elementInfo || null)), f(!1);
    },
    [e, P]
  );
  ce(() => {
    t({ type: "EDITOR_READY" });
  }, []), ce(() => {
    t({ type: "FEATURES_FOR_HEATMAP", features: ze?.data ?? [] });
  }, [ze, t]), ce(() => {
    const S = localStorage.getItem(hn) === "true";
    v(S);
  }, []), ce(() => {
    e ? (a(e.selector), d(e.elementInfo), X(e.xpath || ""), o(!0), r("form"), c(""), f(!1), W("create"), U(""), V("exact")) : Ce();
  }, [e]);
  const me = () => {
    const S = !y;
    v(S);
    try {
      localStorage.setItem(hn, String(S));
    } catch {
    }
    t({ type: "HEATMAP_TOGGLE", enabled: S });
  }, j = (S) => S.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""), De = async () => {
    const S = h.trim();
    if (!S) {
      f(!0);
      return;
    }
    f(!1);
    const te = Z || e?.xpath || "";
    if (D === "exact") {
      if (!te) return;
      const pe = {
        name: S,
        slug: j(S),
        description: K.trim() || "",
        status: "active",
        rules: [
          {
            selector_type: "xpath",
            selector_value: te,
            match_mode: "exact",
            priority: 10,
            is_active: !0
          }
        ]
      };
      try {
        we ? (await Ue.mutateAsync({ featureId: we, payload: pe }), ve.invalidateQueries({ queryKey: lt }), Ce()) : (await he.mutateAsync(pe), ve.invalidateQueries({ queryKey: lt }), Ce());
      } catch {
      }
      return;
    }
  }, le = async (S) => {
    if (window.confirm("Delete this feature?")) {
      Oe(S);
      try {
        await xe.mutateAsync(S), ve.invalidateQueries({ queryKey: lt }), we === S && (oe(null), Ce());
      } catch {
      } finally {
        Oe(null);
      }
    }
  }, Ve = (S) => {
    const te = [];
    S.tagName && te.push(`Tag: ${S.tagName}`), S.id && te.push(`ID: ${S.id}`), S.className && te.push(`Class: ${S.className}`);
    const pe = (S.textContent || "").slice(0, 80);
    return pe && te.push(`Text: ${pe}`), te.join(" | ");
  };
  return O ? /* @__PURE__ */ n("div", { style: { ...m.panel, padding: "0.5rem" }, children: /* @__PURE__ */ n("div", { style: m.panelHeader, children: [
    /* @__PURE__ */ n("h2", { style: { ...m.headerTitle, fontSize: "1.125rem" }, children: s ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ n($, { variant: "icon", title: "Expand", onClick: () => C(!1), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ n("div", { style: m.panel, children: [
    /* @__PURE__ */ n("div", { style: m.panelHeader, children: [
      /* @__PURE__ */ n("h2", { style: { ...m.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ n($, { variant: "icon", title: "Minimize", onClick: () => C(!0), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ n("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: s ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ n("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ n("a", { href: "#", style: m.link, onClick: (S) => {
          S.preventDefault(), Ce();
        }, children: [
          /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ n("div", { children: [
          /* @__PURE__ */ n("div", { style: m.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureSetup", checked: z === "create", onChange: () => W("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureSetup", checked: z === "merge", onChange: () => W("merge"), style: { accentColor: "#3b82f6" } }),
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
                ct,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: h,
                  onInput: (S) => c(S.target.value)
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
                Qn,
                {
                  placeholder: "Describe your Feature",
                  value: K,
                  onInput: (S) => U(S.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ n("div", { children: [
          /* @__PURE__ */ n("div", { style: { ...m.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "FEATURE ELEMENT MATCHING",
            /* @__PURE__ */ n("span", { style: { color: "#94a3b8" }, title: "Match the element for this feature", children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureMatch", checked: D === "suggested", onChange: () => V("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureMatch", checked: D === "ruleBuilder", onChange: () => V("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureMatch", checked: D === "customCss", onChange: () => V("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ n("label", { style: m.radioLabel, children: [
              /* @__PURE__ */ n("input", { type: "radio", name: "featureMatch", checked: D === "exact", onChange: () => V("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ n("div", { children: [
            /* @__PURE__ */ n("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: D === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ n("div", { style: m.selectorBox, children: D === "exact" ? (e?.xpath ?? Z) || "-" : (e?.selector ?? l) || "-" })
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
                onClick: () => k((S) => !S),
                "aria-expanded": E,
                children: [
                  /* @__PURE__ */ n("label", { style: { ...m.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                  /* @__PURE__ */ n(
                    "iconify-icon",
                    {
                      icon: E ? "mdi:chevron-up" : "mdi:chevron-down",
                      style: { fontSize: "1.125rem", color: "#64748b", flexShrink: 0 }
                    }
                  )
                ]
              }
            ),
            E && /* @__PURE__ */ n("div", { style: { ...m.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ n("div", { style: m.elementInfoText, children: Ve(u) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ n("div", { style: m.footer, children: [
        /* @__PURE__ */ n($, { variant: "secondary", onClick: Ce, children: "Cancel" }),
        /* @__PURE__ */ n($, { variant: "primary", style: { flex: 1 }, onClick: De, disabled: $e, children: $e ? "Saving..." : "Save" })
      ] })
    ] }) : /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i === "taggedList" ? /* @__PURE__ */ n(Y, { children: [
      /* @__PURE__ */ n(
        "a",
        {
          href: "#",
          style: m.link,
          onClick: (S) => {
            S.preventDefault(), Ce();
          },
          children: [
            /* @__PURE__ */ n("iconify-icon", { icon: "mdi:arrow-left" }),
            " Back to overview"
          ]
        }
      ),
      /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ n("span", { style: { ...m.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: ae ? "…" : Ee.length }),
        /* @__PURE__ */ n("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Tagged Features" })
      ] }),
      /* @__PURE__ */ n("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged features" }),
      /* @__PURE__ */ n("div", { style: m.searchWrap, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:magnify", style: m.searchIcon }),
        /* @__PURE__ */ n(
          ct,
          {
            type: "text",
            placeholder: "Search features",
            value: Le,
            onInput: (S) => ue(S.target.value),
            style: m.searchInput
          }
        ),
        Le && /* @__PURE__ */ n($, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => ue(""), children: "Clear" })
      ] }),
      ae ? /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
        /* @__PURE__ */ n("span", { children: "Loading features…" })
      ] }) : Ee.map((S) => {
        const te = Fe === S.feature_id;
        return /* @__PURE__ */ n("div", { style: { ...m.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: S.name || "Unnamed" }),
          /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.25rem", alignItems: "center" }, children: [
            /* @__PURE__ */ n($, { variant: "iconSm", title: "Edit", onClick: () => J(S), disabled: te, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:pencil" }) }),
            te ? /* @__PURE__ */ n("span", { style: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", color: "#64748b" } }) }) : /* @__PURE__ */ n($, { variant: "iconSm", title: "Delete", onClick: () => le(S.feature_id), children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, S.feature_id);
      }),
      /* @__PURE__ */ n($, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: () => J(), children: "Tag Feature" })
    ] }) : ae ? /* @__PURE__ */ n("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
      /* @__PURE__ */ n("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.75rem" } }),
      /* @__PURE__ */ n("span", { children: "Loading features…" })
    ] }) : /* @__PURE__ */ n(Y, { children: [
      /* @__PURE__ */ n("div", { style: m.sectionLabel, children: "FEATURES OVERVIEW" }),
      /* @__PURE__ */ n("div", { style: { ...m.card, marginBottom: "0.75rem" }, children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ n("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ n("span", { style: { ...m.badge, background: "#14b8a6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: "0" }),
          /* @__PURE__ */ n("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Suggested Features" }),
            /* @__PURE__ */ n("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of untagged elements on this page" })
          ] })
        ] }),
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ n("div", { style: { ...m.card, marginBottom: "0.75rem", cursor: "pointer" }, onClick: I, children: /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ n("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ n("span", { style: { ...m.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: Ae }),
          /* @__PURE__ */ n("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ n("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Tagged Features" }),
            /* @__PURE__ */ n("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of tagged Features on this page" })
          ] })
        ] }),
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ n("div", { style: m.heatmapRow, children: [
        /* @__PURE__ */ n("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Heatmap" }),
        /* @__PURE__ */ n("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ n(
            "button",
            {
              role: "switch",
              tabIndex: 0,
              style: m.toggle(y),
              onClick: me,
              onKeyDown: (S) => S.key === "Enter" && me(),
              children: /* @__PURE__ */ n("span", { style: m.toggleThumb(y) })
            }
          ),
          /* @__PURE__ */ n($, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ n("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ n("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ n(
          $,
          {
            variant: w ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              b(!0), t({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Re-Select"
          }
        ),
        /* @__PURE__ */ n(
          $,
          {
            variant: "secondary",
            style: w ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              b(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Hide Selector"
          }
        )
      ] })
    ] }) }) })
  ] });
}
const _o = new Zr({
  defaultOptions: { mutations: { retry: 0 } }
});
class bo {
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
      z-index: ${g.zIndex.editor};
      display: none;
      overflow: hidden;
    `, this.createDragHandle(), this.loadEditorHtml(), window.addEventListener("message", this.handleMessage);
    const s = () => {
      document.body ? (document.body.appendChild(this.iframe), this.dragHandle && document.body.appendChild(this.dragHandle), this.iframe && (this.iframe.onload = () => {
        this.isReady = !0, this.renderEditorContent(), this.updateDragHandlePosition();
      })) : document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", s) : setTimeout(s, 100);
    };
    s();
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
    const r = (o) => {
      if (o.type === "EXPAND_TO_FULLSCREEN") {
        this.expandToFullscreen();
        return;
      }
      if (o.type === "COLLAPSE_FROM_FULLSCREEN") {
        this.collapseFromFullscreen();
        return;
      }
      if (o.type === "PREVIEW_CONTENT") {
        this.previewWasFullscreen = this.isFullscreen, this.collapseFromFullscreen(), this.hide(), this.messageCallback?.(o);
        return;
      }
      if (o.type === "CLOSE_PREVIEW") {
        this.restoreAfterPreview(), this.messageCallback?.(o);
        return;
      }
      this.messageCallback?.(o);
    }, s = this.mode === "tag-page" ? /* @__PURE__ */ n(ro, { onMessage: r }) : this.mode === "tag-feature" ? /* @__PURE__ */ n(
      yo,
      {
        onMessage: r,
        elementSelected: this.elementSelectedState
      }
    ) : /* @__PURE__ */ n(
      Ws,
      {
        onMessage: r,
        elementSelected: this.elementSelectedState,
        guideId: this.guideId,
        templateId: this.templateId
      }
    );
    He(
      /* @__PURE__ */ n(hs, { client: _o, children: s }),
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
  <style>${Es}</style>
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
      z-index: ${g.zIndex.controls};
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
    const i = e.clientX - this.dragStartX, r = e.clientY - this.dragStartY, s = window.innerWidth, o = window.innerHeight, l = this.iframe.offsetWidth, a = Math.max(-l + 50, Math.min(i, s - 50)), u = Math.max(0, Math.min(r, o - 100));
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
const vo = "visual-designer-guides", pn = "1.0.0";
class xo {
  storageKey;
  constructor(e = vo) {
    this.storageKey = e;
  }
  getGuides() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const i = JSON.parse(e);
      return i.version !== pn ? (this.clear(), []) : i.guides || [];
    } catch {
      return [];
    }
  }
  getGuidesByPage(e) {
    return this.getGuides().filter((r) => r.page === e && r.status === "active");
  }
  saveGuide(e) {
    const i = this.getGuides(), r = i.findIndex((o) => o.id === e.id), s = {
      ...e,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: e.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    r >= 0 ? i[r] = s : i.push(s), this.saveGuides(i);
  }
  deleteGuide(e) {
    const i = this.getGuides().filter((r) => r.id !== e);
    this.saveGuides(i);
  }
  saveGuides(e) {
    const i = { guides: e, version: pn };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(e) {
    return this.getGuides().find((i) => i.id === e) || null;
  }
}
function So({ onExit: t }) {
  const e = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: g.bg,
    border: `2px solid ${g.primary}`,
    borderRadius: g.borderRadius,
    color: g.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: g.fontFamily,
    cursor: "pointer",
    zIndex: String(g.zIndex.controls),
    boxShadow: g.shadow,
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
        i.currentTarget.style.background = g.primary, i.currentTarget.style.color = g.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = g.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = g.bg, i.currentTarget.style.color = g.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = g.shadow;
      },
      children: [
        /* @__PURE__ */ n("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function wo() {
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
        border: `5px solid ${g.primary}`,
        pointerEvents: "none",
        zIndex: g.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function Eo() {
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
        background: g.primary,
        color: g.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: g.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${g.primary}`,
        borderTop: "none",
        zIndex: g.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function Co() {
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
        zIndex: g.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: g.fontFamily,
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
                    borderTopColor: g.primary,
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
function ko(t) {
  return /* @__PURE__ */ n(Y, { children: [
    t.showExitButton && /* @__PURE__ */ n(So, { onExit: t.onExitEditor }),
    t.showRedBorder && /* @__PURE__ */ n(wo, {}),
    t.showBadge && /* @__PURE__ */ n(Eo, {}),
    t.showLoading && /* @__PURE__ */ n(Co, {})
  ] });
}
function Io(t, e) {
  He(/* @__PURE__ */ n(ko, { ...e }), t);
}
class Kn {
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
    this.config = e, this.guideId = e.guideId ?? null, this.templateId = e.templateId ?? null, this.storage = new xo(e.storageKey), this.editorMode = new sr(), this.guideRenderer = new Ir(), this.featureHeatmapRenderer = new Rr(), this.editorFrame = new bo();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((i, r) => {
      const s = {
        guide_id: i.guide_id,
        step_index: r
      }, a = [...(i.templates || []).filter((u) => u.is_active)].sort((u, d) => u.step_order - d.step_order)[r];
      return a && (s.template_id = a.template_id, s.template_key = a.template.template_key, s.step_order = a.step_order, s.xpath = a.x_path), this.config.onGuideDismissed?.(i.guide_id), this.trackEvent("dismissed", s);
    }), this.guideRenderer.setOnPollResponse((i, r, s, o, l, a, u) => {
      this.trackEvent("poll_responses", {
        guide_id: i.guide_id,
        template_id: r,
        block_id: s,
        step_index: u,
        survey_question: l,
        survey_response: a,
        survey_type: o
      });
    }), this.guideRenderer.setOnNext((i, r, s) => {
      const a = [...(i.templates || []).filter((u) => u.is_active)].sort((u, d) => u.step_order - d.step_order)[r];
      if (a) {
        const u = r === s - 1;
        let d = "middle";
        r === 0 ? d = "first" : u && (d = "last");
        const h = {
          guide_id: i.guide_id,
          template_id: a.template_id,
          map_id: a.map_id,
          step_order: a.step_order,
          template_key: a.template.template_key,
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
    return this.storage.getGuidesByPage(Je());
  }
  saveGuide(e) {
    const i = {
      ...e,
      id: Ii(),
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
      const e = Je(), i = await Se.get(`/guides?target_page=${encodeURIComponent(e)}`);
      if (i && i.data) {
        this.fetchedGuides = Array.isArray(i.data) ? i.data : [i.data], console.log("[Visual Designer] Fetched guides for page:", e, this.fetchedGuides);
        for (const r of this.fetchedGuides)
          if (r.target_segment === null) {
            const o = `rg_guide_auto_${r.guide_id}`;
            if (!sessionStorage.getItem(o)) {
              console.log("[Visual Designer] Auto-triggering guide:", r.guide_name), this.guideRenderer.renderTriggeredGuide(r), sessionStorage.setItem(o, "true");
              break;
            }
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
    let s = "Unknown", o = "Unknown";
    return e.indexOf("Win") > -1 ? (s = "Windows", e.indexOf("Windows NT 10.0") > -1 && (o = "10")) : e.indexOf("Mac") > -1 ? (s = "macOS", o = e.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : e.indexOf("Linux") > -1 ? s = "Linux" : e.indexOf("Android") > -1 ? (s = "Android", o = e.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (e.indexOf("iOS") > -1 || e.indexOf("iPhone") > -1 || e.indexOf("iPad") > -1) && (s = "iOS", o = e.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), {
      device_type: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(e) ? "mobile" : "desktop",
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      browser_name: i,
      browser_version: r,
      os_name: s,
      os_version: o,
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
      const i = (/* @__PURE__ */ new Date()).toISOString(), r = this._getIdentity(), s = this._getPageContext();
      let o = 0;
      const l = this._getStorageItem("__rg_session_start");
      if (l) {
        const h = new Date(l).getTime();
        isNaN(h) || (o = Date.now() - h);
      }
      const u = (this._getStorageItem("__rg_visitor_traits") || {}).email || null, d = e.map((h) => {
        const c = h.properties || {};
        return {
          event_id: "evt_" + Ii(),
          event_type: "guide",
          event_name: h.eventName,
          timestamp: i,
          ingested_at: i,
          // Simulating server-side ingestion time
          visitor_id: r.visitor_id,
          account_id: r.account_id,
          session_id: r.session_id,
          page_url: s.page_url,
          visitor_email: u,
          session_duration_ms: o,
          element_id: c.element_id || c.xpath || null,
          guide_id: c.guide_id || null,
          properties: c
        };
      });
      console.log("[Visual Designer] Tracking Batch:", d), await Se.post("/guide-events", {
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
    for (const s of this.fetchedGuides)
      s.target_segment !== null && s.target_segment === r && (this.trackEvent("triggered", {
        guide_id: s.guide_id,
        guide_name: s.guide_name,
        xpath: r
      }), this.guideRenderer.renderTriggeredGuide(s));
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
      page: Je()
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
      let s = (i.rules?.find(
        (o) => o.selector_type === "xpath" && (o.selector_value ?? "").trim() !== ""
      )?.selector_value ?? "").trim();
      return s && s.startsWith("/body") && (s = "/html[1]" + s), {
        id: i.feature_id,
        featureName: i.name,
        selector: s,
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
        r.layout || (r.layout = {}), r.layout.position = e.position, i.templates[0].content = JSON.stringify(r), i.templates[0].template.content = JSON.stringify(r);
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
      z-index: ${g.zIndex.controls};
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
    }, s = () => {
      this.featureHeatmapRenderer.updatePositions(this.getTaggedFeatures());
    };
    window.addEventListener("resize", () => {
      clearTimeout(e), e = window.setTimeout(() => {
        r(), s();
      }, 100);
    }), window.addEventListener(
      "scroll",
      () => {
        clearTimeout(i), i = window.setTimeout(() => {
          r(), s();
        }, 50);
      },
      !0
    ), window.addEventListener("popstate", () => this.handlePageChange());
    const o = history.pushState;
    o && (history.pushState = (...a) => {
      o.apply(history, a), this.handlePageChange();
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
    this.ensureSDKRoot(), this.sdkRoot && Io(this.sdkRoot, {
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
const wi = "1.0.0", Yn = "rg-web-sdk", To = "web", Ro = 1, Q = {
  VISITOR_ID: "__rg_visitor_id",
  ACCOUNT_ID: "__rg_account_id",
  SESSION_ID: "__rg_session_id",
  SESSION_START: "__rg_session_start",
  SESSION_LAST_ACTIVITY: "__rg_session_last_activity",
  EVENT_QUEUE: "__rg_event_queue",
  OPT_OUT: "__rg_opt_out",
  VISITOR_TRAITS: "__rg_visitor_traits",
  ACCOUNT_TRAITS: "__rg_account_traits"
}, Oo = {
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
}, Qe = {
  PAGE_VIEW: "page_view",
  CLICK: "click",
  INPUT: "input",
  SCROLL: "scroll",
  ERROR: "error"
}, Ke = {
  NAVIGATION: "navigation",
  ENGAGEMENT: "engagement",
  DIAGNOSTIC: "diagnostic"
}, dt = {
  NORMAL: "normal",
  RAGE_CLICK: "rage_click",
  ERROR_CLICK: "error_click",
  U_TURN: "u_turn"
}, ot = {
  rageClickThreshold: 3,
  rageClickWindow: 1e3,
  deadClickDelay: 300,
  errorClickWindow: 2e3,
  uturnThreshold: 5e3
}, Qt = [1e3, 2e3, 5e3, 1e4, 3e4], fn = 5, Ao = 1e3, Po = 100, Fo = {
  click: { limit: 100, window: 1e3 },
  scroll: { limit: 10, window: 1e3 },
  input: { limit: 50, window: 1e3 }
}, Kt = {
  pageView: 100,
  scroll: 500
}, at = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
};
function ut() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (t) => {
    const e = Math.random() * 16 | 0;
    return (t === "x" ? e : e & 3 | 8).toString(16);
  });
}
function ht() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function Lo() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function zo() {
  const t = navigator.userAgent;
  return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(t) ? "tablet" : /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silfae|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(t) ? "mobile" : "desktop";
}
function Do() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Chrome") > -1 && t.indexOf("Edg") === -1 ? (e = "Chrome", i = t.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Safari") > -1 && t.indexOf("Chrome") === -1 ? (e = "Safari", i = t.match(/Version\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Firefox") > -1 ? (e = "Firefox", i = t.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Edg") > -1 ? (e = "Edge", i = t.match(/Edg\/([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("MSIE") > -1 || t.indexOf("Trident") > -1) && (e = "Internet Explorer", i = t.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || "Unknown"), { browserName: e, browserVersion: i };
}
function No() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Win") > -1 ? (e = "Windows", t.indexOf("Windows NT 10.0") > -1 ? i = "10" : t.indexOf("Windows NT 6.3") > -1 ? i = "8.1" : t.indexOf("Windows NT 6.2") > -1 ? i = "8" : t.indexOf("Windows NT 6.1") > -1 && (i = "7")) : t.indexOf("Mac") > -1 ? (e = "macOS", i = t.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : t.indexOf("Linux") > -1 ? e = "Linux" : t.indexOf("Android") > -1 ? (e = "Android", i = t.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("iOS") > -1 || t.indexOf("iPhone") > -1 || t.indexOf("iPad") > -1) && (e = "iOS", i = t.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), { osName: e, osVersion: i };
}
function Mo() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Unknown";
  }
}
function Uo(t) {
  try {
    const e = new URL(t), i = {};
    return e.searchParams.forEach((r, s) => {
      i[s] = r;
    }), i;
  } catch {
    return {};
  }
}
function ci(t, e = 200) {
  return t ? t.length > e ? t.substring(0, e) : t : null;
}
function di(t, ...e) {
  return Object.assign({}, t, ...e);
}
function mn(t, e) {
  let i;
  return function(...s) {
    const o = () => {
      clearTimeout(i), t(...s);
    };
    clearTimeout(i), i = setTimeout(o, e);
  };
}
function Bo(t, e = null) {
  try {
    return JSON.parse(t);
  } catch {
    return e;
  }
}
function Yt(t, e = null) {
  try {
    return JSON.stringify(t);
  } catch {
    return e;
  }
}
function R(t, ...e) {
  typeof console < "u" && console[t] && console[t]("[RG SDK]", ...e);
}
function Wo(t) {
  if (!t) return null;
  if (t.id)
    return `//*[@id="${t.id}"]`;
  const e = [];
  let i = t;
  for (; i && i.nodeType === Node.ELEMENT_NODE; ) {
    let r = 1, s = i.previousSibling;
    for (; s; )
      s.nodeType === Node.ELEMENT_NODE && s.tagName === i.tagName && r++, s = s.previousSibling;
    const o = i.tagName.toLowerCase();
    e.unshift(`${o}[${r}]`), i = i.parentNode;
  }
  return e.length > 0 ? "/" + e.join("/") : null;
}
function Go(t) {
  if (!t) return null;
  if (t.id)
    return `#${CSS.escape(t.id)}`;
  const e = [];
  let i = t;
  for (; i && i.nodeType === Node.ELEMENT_NODE; ) {
    let r = i.tagName.toLowerCase();
    if (i.className && typeof i.className == "string") {
      const s = i.className.split(/\s+/).filter((o) => o && !/^[0-9]/.test(o)).map((o) => "." + CSS.escape(o)).join("");
      r += s;
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
function $o(t) {
  if (!t) return null;
  const e = t.getAttribute("aria-label") || t.getAttribute("alt") || t.getAttribute("title") || (t.tagName === "INPUT" ? t.value : null) || t.textContent?.trim() || null;
  return ci(e, 200);
}
function Ho(t) {
  if (!t) return !1;
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0";
}
class qo {
  constructor(e = "localStorage") {
    this.preferredStorage = e, this.storageType = this._detectAvailableStorage(), this.memoryStorage = {};
  }
  _detectAvailableStorage() {
    return this.preferredStorage === "localStorage" && this._testStorage(window.localStorage) ? "localStorage" : this._testStorage(window.sessionStorage) ? "sessionStorage" : (R("warn", "No persistent storage available, using in-memory storage"), "memory");
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
      const r = this._getStorage(), s = Yt(i);
      return s ? (r ? r.setItem(e, s) : this.memoryStorage[e] = s, !0) : (R("warn", "Failed to serialize value for key:", e), !1);
    } catch (r) {
      if (r.name === "QuotaExceededError") {
        R("warn", "Storage quota exceeded, attempting cleanup"), this._cleanup();
        try {
          const s = this._getStorage();
          return s ? s.setItem(e, Yt(i)) : this.memoryStorage[e] = Yt(i), !0;
        } catch (s) {
          return R("error", "Failed to set item after cleanup:", e, s), !1;
        }
      }
      return R("error", "Failed to set item:", e, r), !1;
    }
  }
  getItem(e) {
    try {
      const i = this._getStorage();
      let r;
      return i ? r = i.getItem(e) : r = this.memoryStorage[e], r == null ? null : Bo(r, null);
    } catch (i) {
      return R("error", "Failed to get item:", e, i), null;
    }
  }
  removeItem(e) {
    try {
      const i = this._getStorage();
      return i ? i.removeItem(e) : delete this.memoryStorage[e], !0;
    } catch (i) {
      return R("error", "Failed to remove item:", e, i), !1;
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
      return R("error", "Failed to clear storage:", e), !1;
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
        R("error", "Cleanup failed:", i);
      }
  }
  getStorageType() {
    return this.storageType;
  }
  isPersistent() {
    return this.storageType !== "memory";
  }
}
class Vo {
  constructor(e, i) {
    this.storage = e, this.config = i, this.visitorId = null, this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this.sessionId = null, this.sessionStartTime = null, this.sessionLastActivity = null, this.sessionEventCount = 0, this.sessionProperties = {}, this.pendingIdentity = null;
  }
  initialize() {
    this._loadVisitor(), this._loadAccount(), this._loadOrCreateSession(), this.pendingIdentity && (this.identify(this.pendingIdentity.visitor, this.pendingIdentity.account), this.pendingIdentity = null), R("info", "Identity initialized:", {
      visitorId: this.visitorId,
      accountId: this.accountId,
      sessionId: this.sessionId
    });
  }
  _loadVisitor() {
    const e = this.storage.getItem(Q.VISITOR_ID), i = this.storage.getItem(Q.VISITOR_TRAITS) || {};
    e ? (this.visitorId = e, this.visitorTraits = i) : (this.visitorId = "anon_" + ut(), this._persistVisitor());
  }
  _loadAccount() {
    const e = this.storage.getItem(Q.ACCOUNT_ID), i = this.storage.getItem(Q.ACCOUNT_TRAITS) || {};
    e && (this.accountId = e, this.accountTraits = i);
  }
  _loadOrCreateSession() {
    const e = this.storage.getItem(Q.SESSION_ID), i = this.storage.getItem(Q.SESSION_START), r = this.storage.getItem(Q.SESSION_LAST_ACTIVITY), s = Date.now(), o = this.config.sessionTimeout * 60 * 1e3;
    if (e && r && s - new Date(r).getTime() < o) {
      this.sessionId = e, this.sessionStartTime = i, this.sessionLastActivity = r, this._updateSessionActivity();
      return;
    }
    this._createNewSession();
  }
  _createNewSession() {
    this.sessionId = "sess_" + ut(), this.sessionStartTime = ht(), this.sessionLastActivity = ht(), this.sessionEventCount = 0, this._captureSessionProperties(), this._persistSession(), R("info", "New session created:", this.sessionId);
  }
  _captureSessionProperties() {
    const e = window.location.href, i = Uo(e);
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
    this.sessionLastActivity = ht(), this.sessionEventCount++, this.storage.setItem(Q.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  _persistVisitor() {
    this.storage.setItem(Q.VISITOR_ID, this.visitorId), this.storage.setItem(Q.VISITOR_TRAITS, this.visitorTraits);
  }
  _persistAccount() {
    this.accountId && (this.storage.setItem(Q.ACCOUNT_ID, this.accountId), this.storage.setItem(Q.ACCOUNT_TRAITS, this.accountTraits));
  }
  _persistSession() {
    this.storage.setItem(Q.SESSION_ID, this.sessionId), this.storage.setItem(Q.SESSION_START, this.sessionStartTime), this.storage.setItem(Q.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  identify(e, i = null) {
    if (e && e.id) {
      this.visitorId && this.visitorId !== e.id && !this.visitorId.startsWith("anon_") && R("warn", `Visitor ID changed from ${this.visitorId} to ${e.id}`), this.visitorId = e.id;
      const { id: r, ...s } = e;
      this.visitorTraits = di(this.visitorTraits, s), this._persistVisitor();
    }
    if (i && i.id) {
      this.accountId && this.accountId !== i.id && R("info", `Account changed from ${this.accountId} to ${i.id}`), this.accountId = i.id;
      const { id: r, ...s } = i;
      this.accountTraits = di(this.accountTraits, s), this._persistAccount();
    }
    R("info", "Identity updated:", {
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
    this.storage.removeItem(Q.VISITOR_ID), this.storage.removeItem(Q.VISITOR_TRAITS), this.storage.removeItem(Q.ACCOUNT_ID), this.storage.removeItem(Q.ACCOUNT_TRAITS), this.storage.removeItem(Q.SESSION_ID), this.storage.removeItem(Q.SESSION_START), this.storage.removeItem(Q.SESSION_LAST_ACTIVITY), this.visitorId = "anon_" + ut(), this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this._createNewSession(), this._persistVisitor(), R("info", "Identity reset");
  }
}
class jo {
  constructor(e) {
    this.identityManager = e, this.deviceInfo = this._captureDeviceInfo();
  }
  _captureDeviceInfo() {
    const { browserName: e, browserVersion: i } = Do(), { osName: r, osVersion: s } = No();
    return {
      device_type: zo(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      browser_name: e,
      browser_version: i,
      os_name: r,
      os_version: s,
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: Mo()
    };
  }
  buildEvent(e) {
    const i = ht(), r = this.identityManager.getIdentityContext(), s = {
      event_id: "evt_" + ut(),
      visitor_id: r.visitor_id,
      account_id: r.account_id,
      session_id: r.session_id,
      event_name: e.event_name,
      event_type: e.event_type,
      timestamp: i,
      event_date: Lo(),
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
      sdk_version: wi,
      sdk_name: Yn,
      sdk_source: To,
      data_version: Ro,
      captured_at: i,
      error_message: e.error_message || null,
      error_stack: e.error_stack || null,
      console_logs: e.console_logs || null
    };
    return e.event_name === "click" && (s.element_position_x = e.click_x || null, s.element_position_y = e.click_y || null, s.click_button = e.click_button || null, s.modifier_alt = e.modifier_alt || !1, s.modifier_ctrl = e.modifier_ctrl || !1, s.modifier_shift = e.modifier_shift || !1, s.modifier_meta = e.modifier_meta || !1), e.event_name === "scroll" && (s.scroll_depth_percent = e.scroll_depth_percent || null, s.scroll_y = e.scroll_y || null, s.milestone_25 = e.milestone_25 || !1, s.milestone_50 = e.milestone_50 || !1, s.milestone_75 = e.milestone_75 || !1, s.milestone_100 = e.milestone_100 || !1), e.event_name === "input" && (s.element_type = e.element_type || null, s.element_name = e.element_name || null, s.element_placeholder = e.element_placeholder || null, s.form_id = e.form_id || null, s.form_name = e.form_name || null, s.field_value = null), e.event_name === "error" && (s.error_type = e.error_type || null, s.error_line = e.error_line || null, s.error_column = e.error_column || null, s.error_filename = e.error_filename || null), e._originalElement && (s._originalElement = e._originalElement), s;
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
class Qo {
  constructor(e, i) {
    this.storage = e, this.config = i, this.consentGranted = !i.requireConsent;
  }
  processEvent(e) {
    return this.isOptedOut() || this.config.requireConsent && !this.consentGranted || this.isInDoNotProcessList(e.visitor_id) || e._originalElement && this.isSensitiveElement(e._originalElement) ? null : (e = this.maskPII(e), e = this.removeBlacklistedFields(e), delete e._originalElement, e);
  }
  isOptedOut() {
    return this.storage.getItem(Q.OPT_OUT) === !0;
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
        R("warn", "Invalid sensitive selector:", r);
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
    i = i.replace(at.email, "[EMAIL_REDACTED]"), i = i.replace(at.phone, "[PHONE_REDACTED]"), i = i.replace(at.ssn, "[SSN_REDACTED]"), i = i.replace(at.creditCard, "[CC_REDACTED]"), i = i.replace(at.ipAddress, "[IP_REDACTED]");
    const r = this.config.privacyConfig?.customPIIPatterns || [];
    for (const s of r)
      try {
        i = i.replace(s, "[REDACTED]");
      } catch {
        R("warn", "Invalid custom PII pattern:", s);
      }
    return i;
  }
  _maskPIIInObject(e) {
    if (!e || typeof e != "object") return e;
    const i = Array.isArray(e) ? [] : {};
    for (const r in e) {
      const s = e[r];
      typeof s == "string" ? i[r] = this.maskPIIInText(s) : typeof s == "object" && s !== null ? i[r] = this._maskPIIInObject(s) : i[r] = s;
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
    this.consentGranted = !0, R("info", "User consent granted");
  }
  revokeConsent() {
    this.consentGranted = !1, R("info", "User consent revoked");
  }
  optOut() {
    this.storage.setItem(Q.OPT_OUT, !0), R("info", "User opted out");
  }
  optIn() {
    this.storage.removeItem(Q.OPT_OUT), R("info", "User opted in");
  }
  validateEventSize(e) {
    const i = JSON.stringify(e).length, r = 10 * 1024;
    return i > r ? (R("warn", "Event exceeds max size, truncating:", i), this.truncateEvent(e)) : e;
  }
  truncateEvent(e) {
    return e.element_text && (e.element_text = ci(e.element_text, 100)), e.error_stack && (e.error_stack = ci(e.error_stack, 500)), e.console_logs && (e.console_logs = e.console_logs.slice(0, 5)), e.custom_properties && JSON.stringify(e.custom_properties).length > 5e3 && (e.custom_properties = { _truncated: !0 }), e;
  }
  sanitizeURL(e) {
    try {
      const i = new URL(e);
      return ["token", "key", "password", "secret", "api_key", "access_token"].forEach((s) => {
        i.searchParams.has(s) && i.searchParams.set(s, "[REDACTED]");
      }), i.toString();
    } catch {
      return e;
    }
  }
}
class Ko {
  constructor() {
    this.clickHistory = [], this.deadClickTimers = /* @__PURE__ */ new Map(), this.recentErrors = [], this.navigationHistory = [], this._setupErrorListener(), this._setupNavigationListener();
  }
  detectClickInteraction(e, i) {
    const r = this._getElementKey(e), s = Date.now();
    return this._detectRageClick(r, s) ? dt.RAGE_CLICK : this._detectErrorClick(r, s) ? dt.ERROR_CLICK : (this._scheduleDeadClickCheck(e, r, s), dt.NORMAL);
  }
  detectUTurn() {
    const e = Date.now(), i = this.navigationHistory;
    if (i.length < 2) return !1;
    const r = i[i.length - 1], s = i[i.length - 2];
    return r.url === s.url && e - s.time < ot.uturnThreshold;
  }
  _detectRageClick(e, i) {
    return this.clickHistory.push({ elementKey: e, time: i }), this.clickHistory = this.clickHistory.filter(
      (s) => i - s.time < ot.rageClickWindow
    ), this.clickHistory.filter(
      (s) => s.elementKey === e
    ).length >= ot.rageClickThreshold;
  }
  _detectErrorClick(e, i) {
    return this.recentErrors = this.recentErrors.filter(
      (r) => i - r.time < ot.errorClickWindow
    ), this.recentErrors.length > 0;
  }
  _scheduleDeadClickCheck(e, i, r) {
    this.deadClickTimers.has(i) && clearTimeout(this.deadClickTimers.get(i));
    const s = setTimeout(() => {
      this._isDeadClick(e, r) && R("debug", "Dead click detected:", i), this.deadClickTimers.delete(i);
    }, ot.deadClickDelay);
    this.deadClickTimers.set(i, s);
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
    history.pushState = function(...s) {
      i.apply(this, s), e();
    }, history.replaceState = function(...s) {
      r.apply(this, s), e();
    }, window.addEventListener("popstate", e);
  }
  _getElementKey(e) {
    if (e.id) return `#${e.id}`;
    const i = e.tagName?.toLowerCase(), r = (e.textContent || "").substring(0, 20), s = e.getBoundingClientRect();
    return `${i}:${r}:${Math.round(s.left)},${Math.round(s.top)}`;
  }
  destroy() {
    this.deadClickTimers.forEach((e) => clearTimeout(e)), this.deadClickTimers.clear(), this.clickHistory = [], this.recentErrors = [], this.navigationHistory = [];
  }
}
class Yo {
  constructor(e, i, r) {
    this.eventBuilder = e, this.privacyEngine = i, this.config = r, this.listeners = [], this.lastPageViewTime = 0, this.lastPageViewUrl = null, this.scrollMilestones = {
      25: !1,
      50: !1,
      75: !1,
      100: !1
    }, this.rateLimiters = {}, this.onEventCapture = null, this.isRunning = !1, this.behavioralDetector = new Ko();
  }
  start(e) {
    if (this.isRunning) {
      R("warn", "Auto-capture already running");
      return;
    }
    this.onEventCapture = e, this.isRunning = !0, this.config.autoPageViews && this._startPageViewTracking(), this.config.autoCapture && (this._startClickTracking(), this._startInputTracking(), this._startScrollTracking(), this._startErrorTracking()), R("info", "Auto-capture started");
  }
  stop() {
    this.isRunning && (this.listeners.forEach(({ target: e, event: i, handler: r, options: s }) => {
      e.removeEventListener(i, r, s);
    }), this.listeners = [], this.behavioralDetector && this.behavioralDetector.destroy(), this.isRunning = !1, R("info", "Auto-capture stopped"));
  }
  _addListener(e, i, r, s = !1) {
    e.addEventListener(i, r, s), this.listeners.push({ target: e, event: i, handler: r, options: s });
  }
  _checkRateLimit(e) {
    const i = Fo[e];
    if (!i) return !0;
    this.rateLimiters[e] || (this.rateLimiters[e] = []);
    const r = Date.now(), s = this.rateLimiters[e];
    return this.rateLimiters[e] = s.filter((o) => r - o < i.window), this.rateLimiters[e].length >= i.limit ? !1 : (this.rateLimiters[e].push(r), !0);
  }
  _emit(e) {
    if (!this.onEventCapture) return;
    const i = this.eventBuilder.buildEvent(e), r = this.privacyEngine.processEvent(i);
    r && this.onEventCapture(r);
  }
  _startPageViewTracking() {
    this._capturePageView();
    const e = history.pushState, i = history.replaceState, r = mn(() => this._capturePageView(), Kt.pageView);
    history.pushState = function(...s) {
      e.apply(this, s), r();
    }, history.replaceState = function(...s) {
      i.apply(this, s), r();
    }, this._addListener(window, "popstate", () => {
      r();
    }), this._addListener(window, "hashchange", () => {
      r();
    });
  }
  _capturePageView() {
    const e = Date.now(), i = window.location.href;
    if (e - this.lastPageViewTime < Kt.pageView || i === this.lastPageViewUrl)
      return;
    this.lastPageViewTime = e, this.lastPageViewUrl = i, this.scrollMilestones = { 25: !1, 50: !1, 75: !1, 100: !1 };
    const r = this.behavioralDetector.detectUTurn();
    this._emit({
      event_name: Qe.PAGE_VIEW,
      event_type: Ke.NAVIGATION,
      interaction_type: r ? dt.U_TURN : dt.NORMAL
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
    if (!Ho(i))
      return;
    const r = this.behavioralDetector.detectClickInteraction(i, e), s = {
      event_name: Qe.CLICK,
      event_type: Ke.ENGAGEMENT,
      element_id: i.id || null,
      element_class: i.classList ? Array.from(i.classList) : [],
      element_tag: i.tagName?.toLowerCase() || null,
      element_text: $o(i),
      element_href: i.href || i.closest("a")?.href || null,
      element_xpath: Wo(i),
      element_selector: Go(i),
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
    this._emit(s);
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
    const s = {
      event_name: Qe.INPUT,
      event_type: Ke.ENGAGEMENT,
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
    this._emit(s);
  }
  _isFormElement(e) {
    return ["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName);
  }
  _startScrollTracking() {
    const e = mn(() => this._handleScroll(), Kt.scroll);
    this._addListener(window, "scroll", e);
  }
  _handleScroll() {
    if (!this._checkRateLimit("scroll"))
      return;
    const e = document.documentElement.scrollHeight, i = window.pageYOffset || document.documentElement.scrollTop, r = window.innerHeight, s = e - r, o = s > 0 ? Math.round(i / s * 100) : 100;
    let l = !1;
    const a = { 25: !1, 50: !1, 75: !1, 100: !1 };
    o >= 25 && !this.scrollMilestones[25] && (a[25] = !0, this.scrollMilestones[25] = !0, l = !0), o >= 50 && !this.scrollMilestones[50] && (a[50] = !0, this.scrollMilestones[50] = !0, l = !0), o >= 75 && !this.scrollMilestones[75] && (a[75] = !0, this.scrollMilestones[75] = !0, l = !0), o >= 100 && !this.scrollMilestones[100] && (a[100] = !0, this.scrollMilestones[100] = !0, l = !0), l && this._emit({
      event_name: Qe.SCROLL,
      event_type: Ke.ENGAGEMENT,
      scroll_depth_percent: o,
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
      event_name: Qe.ERROR,
      event_type: Ke.DIAGNOSTIC,
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
      event_name: Qe.ERROR,
      event_type: Ke.DIAGNOSTIC,
      error_message: i?.message || String(i),
      error_type: i?.name || "UnhandledRejection",
      error_stack: i?.stack || null
    });
  }
  capturePage(e, i = {}) {
    this._emit({
      event_name: Qe.PAGE_VIEW,
      event_type: Ke.NAVIGATION,
      custom_properties: { page_name: e, ...i }
    });
  }
}
class Xo {
  constructor(e) {
    this.storage = e, this.queue = [], this.maxSize = Ao, this.maxPersistedSize = Po, this._restore();
  }
  _restore() {
    try {
      const e = this.storage.getItem(Q.EVENT_QUEUE);
      e && Array.isArray(e) && (this.queue = e, R("info", `Restored ${this.queue.length} events from storage`));
    } catch (e) {
      R("error", "Failed to restore events from storage:", e);
    }
  }
  _persist() {
    try {
      const e = this.queue.slice(-this.maxPersistedSize);
      this.storage.setItem(Q.EVENT_QUEUE, e);
    } catch (e) {
      R("error", "Failed to persist events to storage:", e);
    }
  }
  enqueue(e) {
    if (this.queue.length >= this.maxSize) {
      const i = this.queue.shift();
      R("warn", "Event queue full, dropping oldest event:", i.event_id);
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
    return this.queue = [], this.storage.removeItem(Q.EVENT_QUEUE), e;
  }
  size() {
    return this.queue.length;
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  clear() {
    this.queue = [], this.storage.removeItem(Q.EVENT_QUEUE), R("info", "Event queue cleared");
  }
  getStats() {
    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      percentFull: Math.round(this.queue.length / this.maxSize * 100)
    };
  }
}
class Jo {
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
    }, e), this._setupUnloadHandler(), R("info", "Transport layer started");
  }
  stop() {
    this.batchTimer && (clearInterval(this.batchTimer), this.batchTimer = null), R("info", "Transport layer stopped");
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
      batch_id: "batch_" + ut(),
      events: i,
      event_count: i.length,
      batch_timestamp: ht()
    };
  }
  async _sendBatch(e = null, i = 0) {
    if (e || (e = this._createBatch()), !(!e || e.events.length === 0)) {
      this.isSending = !0;
      try {
        const r = await this._makeRequest(e);
        r.ok ? (this.eventQueue.dequeue(e.events.length), this.stats.sent += e.events.length, R("info", `Batch sent successfully: ${e.events.length} events`)) : await this._handleErrorResponse(r, e, i);
      } catch (r) {
        this._handleNetworkError(r, e, i);
      } finally {
        this.isSending = !1;
      }
    }
  }
  _resolveRequestContext() {
    try {
      const e = localStorage.getItem("customerDetails") ? JSON.parse(localStorage.getItem("customerDetails")) : null, i = localStorage.getItem("RGAuth") ? JSON.parse(localStorage.getItem("RGAuth")) : null, r = localStorage.getItem("selectedViewUser") ? JSON.parse(localStorage.getItem("selectedViewUser")) : null, s = e?.BASE_API_URL_MAIN ? `${e.BASE_API_URL_MAIN}/rg-pex` : this.config.apiHost, o = localStorage.getItem("access_token") || this.config.apiKey, l = r?.id || i?.email || "", a = e?.RG_CUSTOMER_ID || "", u = e?.CUSTOMER_SCHEMA || "", d = r?.role || r?.manager_role, h = sessionStorage.getItem("RGSelectedRole");
      let c;
      d ? c = [d] : h ? c = [h] : c = i?.realm_access?.roles || [];
      const p = c.map((f) => f.replace(/\s+/g, "_")).join(",");
      return { host: s, accessToken: o, iud: l, rcid: a, schema: u, role: p };
    } catch (e) {
      return R("warn", "Failed to resolve request context from localStorage:", e.message), { host: this.config.apiHost, accessToken: this.config.apiKey, iud: "", rcid: "", schema: "", role: "" };
    }
  }
  async _makeRequest(e) {
    const { host: i, accessToken: r, iud: s, rcid: o, schema: l, role: a } = this._resolveRequestContext(), u = `${i}/raw-events`, d = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${r}`,
      "X-RG-SDK-Version": wi,
      "X-RG-SDK-Name": Yn,
      role: a,
      iud: s,
      rcid: o,
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
    const s = e.status;
    if (s >= 400 && s < 500) {
      s === 401 ? R("error", "Invalid API key. Please check your configuration.") : R("error", `Client error (${s}), dropping batch`), this.eventQueue.dequeue(i.events.length), this.stats.failed += i.events.length;
      return;
    }
    (s === 429 || s >= 500) && this._scheduleRetry(i, r);
  }
  _handleNetworkError(e, i, r) {
    R("error", "Network error:", e.message), this._scheduleRetry(i, r);
  }
  _scheduleRetry(e, i) {
    if (i >= fn) {
      R("error", `Max retries exceeded for batch ${e.batch_id}, dropping events`), this.eventQueue.dequeue(e.events.length), this.stats.failed += e.events.length;
      return;
    }
    const r = Qt[i] || Qt[Qt.length - 1], s = Date.now() + r;
    this.retryQueue.set(e.batch_id, {
      batch: e,
      retryCount: i + 1,
      nextRetry: s
    }), this.stats.retried++, R(
      "info",
      `Scheduling retry ${i + 1}/${fn} for batch ${e.batch_id} in ${r}ms`
    ), setTimeout(() => {
      const o = this.retryQueue.get(e.batch_id);
      o && (this.retryQueue.delete(e.batch_id), this._sendBatch(o.batch, o.retryCount));
    }, r);
  }
  async flush() {
    if (!this.eventQueue.isEmpty()) {
      for (R("info", "Flushing event queue..."), this._isFlushRequested = !0; !this.eventQueue.isEmpty() && !this.isSending; )
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
        const { host: i } = this._resolveRequestContext(), r = `${i}/raw-events`, s = JSON.stringify(e);
        navigator.sendBeacon(r, s) ? (this.eventQueue.dequeue(e.events.length), R("info", `Sent ${e.events.length} events via sendBeacon`)) : R("warn", "sendBeacon failed, events may be lost");
      } else
        R("warn", "sendBeacon not available, events may be lost");
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
class Zo {
  constructor() {
    this.initialized = !1, this.config = null, this.storage = null, this.identityManager = null, this.eventBuilder = null, this.privacyEngine = null, this.autoCaptureEngine = null, this.eventQueue = null, this.transportLayer = null, this.pendingIdentify = null;
  }
  initialize(e) {
    if (this.initialized) {
      R("warn", "SDK already initialized");
      return;
    }
    if (!e || !e.apiKey)
      throw new Error("API key is required");
    this.config = di(Oo, e), R("info", "Initializing RG SDK...", {
      version: wi,
      config: this.config
    }), this._initializeModules(), this.initialized = !0, this.pendingIdentify && (this.identify(this.pendingIdentify.visitor, this.pendingIdentify.account), this.pendingIdentify = null), R("info", "RG SDK initialized successfully");
  }
  _initializeModules() {
    this.storage = new qo(this.config.persistence), this.identityManager = new Vo(this.storage, this.config), this.identityManager.initialize(), this.eventBuilder = new jo(this.identityManager), this.privacyEngine = new Qo(this.storage, this.config), this.eventQueue = new Xo(this.storage), this.transportLayer = new Jo(this.config, this.eventQueue), this.transportLayer.start(), this.autoCaptureEngine = new Yo(
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
      this.pendingIdentify = { visitor: e, account: i }, R("info", "Identity queued, will be applied after initialization");
      return;
    }
    this.identityManager.identify(e, i);
  }
  track(e, i = {}) {
    if (!this.initialized) {
      R("warn", "SDK not initialized, cannot track event");
      return;
    }
    if (!e || typeof e != "string") {
      R("warn", "Event name is required and must be a string");
      return;
    }
    const r = this.eventBuilder.buildCustomEvent(e, i), s = this.privacyEngine.processEvent(r);
    if (s) {
      const o = this.privacyEngine.validateEventSize(s);
      this.eventQueue.enqueue(o), this.transportLayer.checkBatchSize();
    }
  }
  page(e = null, i = {}) {
    if (!this.initialized) {
      R("warn", "SDK not initialized, cannot track page view");
      return;
    }
    const r = { ...i };
    e && (r.page_name = e);
    const s = this.eventBuilder.buildPageViewEvent(r), o = this.privacyEngine.processEvent(s);
    if (o) {
      const l = this.privacyEngine.validateEventSize(o);
      this.eventQueue.enqueue(l), this.transportLayer.checkBatchSize();
    }
  }
  async flush() {
    if (!this.initialized) {
      R("warn", "SDK not initialized");
      return;
    }
    await this.transportLayer.flush();
  }
  optOut() {
    if (!this.initialized) {
      R("warn", "SDK not initialized");
      return;
    }
    this.autoCaptureEngine && this.autoCaptureEngine.stop(), this.eventQueue.clear(), this.privacyEngine.optOut(), R("info", "User opted out of tracking");
  }
  optIn() {
    if (!this.initialized) {
      R("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.optIn(), (this.config.autoCapture || this.config.autoPageViews) && this.autoCaptureEngine.start((e) => this._handleCapturedEvent(e)), R("info", "User opted in to tracking");
  }
  grantConsent() {
    if (!this.initialized) {
      R("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.grantConsent();
  }
  revokeConsent() {
    if (!this.initialized) {
      R("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.revokeConsent(), this.eventQueue.clear();
  }
  reset() {
    if (!this.initialized) {
      R("warn", "SDK not initialized");
      return;
    }
    this.identityManager.reset(), R("info", "Identity reset");
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
    this.config.debug = e, R("info", `Debug mode ${e ? "enabled" : "disabled"}`);
  }
}
const _e = new Zo(), Ie = {
  initialize: (t) => {
    _e.initialize(t);
  },
  identify: (t, e) => {
    _e.identify(t, e);
  },
  track: (t, e) => {
    _e.track(t, e);
  },
  page: (t, e) => {
    _e.page(t, e);
  },
  flush: () => _e.flush(),
  optOut: () => {
    _e.optOut();
  },
  optIn: () => {
    _e.optIn();
  },
  grantConsent: () => {
    _e.grantConsent();
  },
  revokeConsent: () => {
    _e.revokeConsent();
  },
  reset: () => {
    _e.reset();
  },
  getVisitorId: () => _e.getVisitorId(),
  getAccountId: () => _e.getAccountId(),
  getSessionId: () => _e.getSessionId(),
  getStats: () => _e.getStats(),
  debug: (t) => {
    _e.debug(t);
  },
  version: "1.0.0"
};
typeof window < "u" && (window.rg = Ie);
let de = null, Xn = !1;
const Jn = "designerGuideId", Zn = "designerTemplateId";
let er = null, tr = null;
function ea() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(Jn) : null;
  } catch {
    return null;
  }
}
function ta() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(Zn) : null;
  } catch {
    return null;
  }
}
function Ge(t) {
  return t?.apiKey ? Ie.initialize(t) : console.warn("[Revgain] No apiKey found in config. Analytics will not start."), de || (de = new Kn({
    ...t,
    guideId: er ?? t?.guideId ?? ea() ?? null,
    templateId: tr ?? t?.templateId ?? ta() ?? null
  }), de.init(), de);
}
function Ei(t, e) {
  Ie.identify(t, e);
}
function Ci(t, e) {
  Ie.track(t, e);
}
function Ft() {
  return de;
}
function ir(t) {
  if (!t || !Array.isArray(t)) return;
  t.splice(0, t.length).forEach((i) => {
    if (!i || !Array.isArray(i) || i.length === 0) return;
    const r = i[0], s = i.slice(1);
    try {
      switch (r) {
        case "initialize":
        case "init":
          Ge(s[0]);
          break;
        case "identify":
          Ei(s[0], s[1]);
          break;
        case "track":
          Ci(s[0], s[1]);
          break;
        case "enableEditor":
          (de ?? Ge()).enableEditor();
          break;
        case "disableEditor":
          de?.disableEditor();
          break;
        case "loadGuides":
          de?.loadGuides();
          break;
        case "getGuides":
          return de?.getGuides();
        default:
          typeof Ie[r] == "function" ? Ie[r](...s) : console.warn("[Revgain] Unknown snippet method:", r);
      }
    } catch (o) {
      console.error("[Revgain] Error processing queued call:", r, o);
    }
  });
}
if (typeof window < "u") {
  const t = window.revgain || window.visualDesigner;
  t && Array.isArray(t._q) && (Xn = !0, t.init = Ge, t.initialize = Ge, t.identify = Ei, t.track = Ci, t.enableEditor = () => (de ?? Ge()).enableEditor(), t.disableEditor = () => de?.disableEditor(), t.loadGuides = () => de?.loadGuides(), t.getGuides = () => de?.getGuides(), t.getInstance = Ft, t.page = (e, i) => Ie.page(e, i), t.flush = () => Ie.flush(), t.reset = () => Ie.reset(), ir(t._q));
  try {
    const e = new URL(window.location.href), i = e.searchParams.get("designer"), r = e.searchParams.get("mode"), s = e.searchParams.get("iud"), o = e.searchParams.get("guide_id"), l = e.searchParams.get("template_id");
    (i === "true" || o != null || l != null) && console.log("[Revgain] URL params detected:", { designerParam: i, modeParam: r, guideIdParam: o }), i === "true" && (r && (window.__visualDesignerMode = r, localStorage.setItem("designerModeType", r)), localStorage.setItem("designerMode", "true"), s && localStorage.setItem(Ps, s), o != null && (er = o, localStorage.setItem(Jn, o)), l != null && (tr = l, localStorage.setItem(Zn, l)), e.searchParams.delete("designer"), e.searchParams.delete("mode"), e.searchParams.delete("iud"), e.searchParams.delete("guide_id"), e.searchParams.delete("template_id"), window.history.replaceState({}, "", e.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !de && !Xn) {
  const t = localStorage.getItem("designerMode") === "true", e = () => {
    !de && t && Ge();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
if (typeof window < "u") {
  const t = {
    init: Ge,
    initialize: Ge,
    identify: Ei,
    track: Ci,
    page: (e, i) => Ie.page(e, i),
    flush: () => Ie.flush(),
    reset: () => Ie.reset(),
    getInstance: Ft,
    DesignerSDK: Kn,
    apiClient: Se,
    _processQueue: ir,
    getGuideId: () => Ft()?.getGuideId() ?? null,
    getTemplateId: () => Ft()?.getTemplateId() ?? null,
    enableEditor: () => (de ?? Ge()).enableEditor(),
    disableEditor: () => de?.disableEditor(),
    analytics: Ie
  };
  window.revgain = t, window.VisualDesigner = t;
}
export {
  Kn as DesignerSDK,
  ir as _processQueue,
  Se as apiClient,
  Ft as getInstance,
  Ei as identify,
  Ge as init,
  Ie as rg,
  Ci as track
};
