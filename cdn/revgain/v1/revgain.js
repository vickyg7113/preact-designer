class Me {
  static generateSelector(e) {
    if (e.id)
      return {
        selector: `#${this.escapeSelector(e.id)}`,
        confidence: "high",
        method: "id"
      };
    const i = this.generateContainsSelector(e);
    if (i) return i;
    const n = this.generatePathFromAnchorToElement(e);
    if (n) return n;
    if (e.hasAttribute("data-testid")) {
      const l = e.getAttribute("data-testid");
      return {
        selector: `[data-testid="${this.escapeAttribute(l)}"]`,
        confidence: "high",
        method: "data-testid"
      };
    }
    const r = this.getSemanticDataAttributes(e);
    if (r.length > 0) {
      const l = r[0], d = e.getAttribute(l);
      return {
        selector: `[${l}="${this.escapeAttribute(d)}"]`,
        confidence: "high",
        method: "data-attribute"
      };
    }
    const o = this.generateAriaSelector(e);
    if (o)
      return { selector: o, confidence: "medium", method: "aria" };
    const a = this.generatePathSelector(e);
    return a ? { selector: a, confidence: "medium", method: "path" } : {
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
    let n = e;
    for (; n && n !== document.documentElement; ) {
      const a = n.tagName.toLowerCase(), l = n.parentElement;
      if (!l) {
        i.unshift(a);
        break;
      }
      const c = Array.from(l.children).filter((h) => h.tagName === n.tagName).indexOf(n) + 1;
      i.unshift(`${a}[${c}]`), n = l;
    }
    const r = i.join("/");
    let o = r ? `/${r}` : "";
    return o.startsWith("/html") || (o = "/html[1]" + (o.startsWith("/") ? o : "/" + o)), o;
  }
  static findElement(e) {
    try {
      if (e.startsWith("/") || e.startsWith("//"))
        return this.findElementByXPath(e);
      const i = this.parseContainsAndDescendant(e);
      if (i) {
        const r = this.findElementWithContains(i.anchorPart);
        if (!r) return null;
        if (i.descendantPart) {
          const o = r.querySelector(i.descendantPart);
          return o || null;
        }
        return r;
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
    const n = e.indexOf(i[0]) + i[0].length, r = e.slice(n), o = r.indexOf(" > ");
    return o === -1 ? null : {
      anchorPart: e.slice(0, n + o).trim(),
      descendantPart: r.slice(o + 3).trim() || null
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
    const n = i[1].trim(), r = i[2].replace(/\\'/g, "'"), o = this.normalizeText(r), a = document.querySelectorAll(n);
    for (let l = 0; l < a.length; l++)
      if (this.normalizeText(a[l].textContent || "").includes(o)) return a[l];
    return null;
  }
  static validateSelector(e) {
    try {
      return this.findElement(e) !== null;
    } catch {
      return !1;
    }
  }
  static getSemanticDataAttributes(e) {
    const i = ["data-id", "data-name", "data-role", "data-component", "data-element"], n = [];
    for (const r of i)
      e.hasAttribute(r) && n.push(r);
    for (let r = 0; r < e.attributes.length; r++) {
      const o = e.attributes[r];
      o.name.startsWith("data-") && !n.includes(o.name) && n.push(o.name);
    }
    return n;
  }
  static generateAriaSelector(e) {
    const i = e.getAttribute("role"), n = e.getAttribute("aria-label");
    if (i) {
      let r = `[role="${this.escapeAttribute(i)}"]`;
      return n && (r += `[aria-label="${this.escapeAttribute(n)}"]`), r;
    }
    return null;
  }
  static generatePathSelector(e) {
    const i = [];
    let n = e;
    for (; n && n !== document.body && n !== document.documentElement; ) {
      let r = n.tagName.toLowerCase();
      if (n.id) {
        r += `#${this.escapeSelector(n.id)}`, i.unshift(r);
        break;
      }
      if (n.className && typeof n.className == "string") {
        const a = n.className.split(/\s+/).filter((l) => l && !l.startsWith("designer-")).slice(0, 2);
        a.length > 0 && (r += "." + a.map((l) => this.escapeSelector(l)).join("."));
      }
      const o = n.parentElement;
      if (o) {
        const a = Array.from(o.children).filter(
          (l) => l.tagName === n.tagName
        );
        a.length > 1 && (r += `:nth-of-type(${a.indexOf(n) + 1})`);
      }
      if (i.unshift(r), n = o, i.length >= 5) break;
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
      const r = e.className.split(/\s+/).filter((o) => o && !o.startsWith("designer-")).slice(0, 2);
      r.length > 0 && (i += "." + r.map((o) => this.escapeSelector(o)).join("."));
    }
    const n = e.parentElement;
    if (n) {
      const r = Array.from(n.children).filter((o) => o.tagName === e.tagName);
      r.length > 1 && (i += `:nth-of-type(${r.indexOf(e) + 1})`);
    }
    return i;
  }
  /** Path from ancestor down to element (inclusive): [ancestor, ..., element] */
  static getPathFromAncestorToElement(e, i) {
    const n = [];
    let r = i;
    for (; r && r !== e; )
      n.unshift(r), r = r.parentElement;
    return r === e && n.unshift(e), n;
  }
  /** Contains selector when element has meaningful text: path + :contains('text') */
  static generateContainsSelector(e) {
    const n = (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
    if (n.length < 2) return null;
    const r = this.generatePathSelector(e);
    if (!r) return null;
    const o = n.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return {
      selector: `${r}:contains('${o}')`,
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
    const { anchor: n, hasId: r } = i, o = this.getPathFromAncestorToElement(n, e);
    if (o.length < 2 || o.length > 12) return null;
    const l = [];
    if (r) {
      l.push(`#${this.escapeSelector(n.id)}`);
      for (let d = 1; d < o.length; d++) l.push(this.buildSegment(o[d]));
    } else {
      const d = (n.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (d.length < 2) return null;
      const c = this.generatePathSelector(n);
      if (!c) return null;
      const h = d.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      l.push(`${c}:contains('${h}')`);
      for (let u = 1; u < o.length; u++) l.push(this.buildSegment(o[u]));
    }
    return {
      selector: l.join(" > "),
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
function Mn(t) {
  const e = t.getBoundingClientRect(), i = {};
  for (let n = 0; n < t.attributes.length; n++) {
    const r = t.attributes[n];
    i[r.name] = r.value;
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
function oi(t) {
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0" && t.getBoundingClientRect().height > 0 && t.getBoundingClientRect().width > 0;
}
function Le() {
  return window.location.pathname || "/";
}
function ai() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Fn(t) {
  const e = t.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function li(t) {
  Fn(t) || t.scrollIntoView({ behavior: "smooth", block: "center" });
}
const ci = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class Nn {
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
      if (i.closest(ci)) {
        this.hideHighlight();
        return;
      }
      if (!oi(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (e) => {
    if (!this.isActive) return;
    const i = e.target;
    i && (i.closest(ci) || (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), oi(i) && this.selectElement(i)));
  };
  handleKeyDown = (e) => {
    this.isActive && e.key === "Escape" && (this.messageCallback?.({ type: "CANCEL" }), this.hideHighlight());
  };
  highlightElement(e) {
    if (!this.highlightOverlay) return;
    const i = e.getBoundingClientRect(), n = window.pageXOffset || document.documentElement.scrollLeft, r = window.pageYOffset || document.documentElement.scrollTop;
    this.highlightOverlay.style.display = "block", this.highlightOverlay.style.left = `${i.left + n}px`, this.highlightOverlay.style.top = `${i.top + r}px`, this.highlightOverlay.style.width = `${i.width}px`, this.highlightOverlay.style.height = `${i.height}px`;
  }
  hideHighlight() {
    this.highlightOverlay && (this.highlightOverlay.style.display = "none");
  }
  selectElement(e) {
    this.highlightElement(e);
    const i = Me.generateSelector(e), n = Mn(e), r = Me.getXPath(e);
    this.messageCallback?.({
      type: "ELEMENT_SELECTED",
      selector: i.selector,
      elementInfo: n,
      xpath: r
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
var pt, C, Vi, Ce, di, qi, ji, Yi, Kt, Ct, Tt, Xi, Qe = {}, Ji = [], Un = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, qe = Array.isArray;
function de(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function Qt(t) {
  t && t.parentNode && t.parentNode.removeChild(t);
}
function It(t, e, i) {
  var n, r, o, a = {};
  for (o in e) o == "key" ? n = e[o] : o == "ref" ? r = e[o] : a[o] = e[o];
  if (arguments.length > 2 && (a.children = arguments.length > 3 ? pt.call(arguments, 2) : i), typeof t == "function" && t.defaultProps != null) for (o in t.defaultProps) a[o] === void 0 && (a[o] = t.defaultProps[o]);
  return st(t, a, n, r, null);
}
function st(t, e, i, n, r) {
  var o = { type: t, props: e, key: i, ref: n, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: r ?? ++Vi, __i: -1, __u: 0 };
  return r == null && C.vnode != null && C.vnode(o), o;
}
function X(t) {
  return t.children;
}
function ue(t, e) {
  this.props = t, this.context = e;
}
function Fe(t, e) {
  if (e == null) return t.__ ? Fe(t.__, t.__i + 1) : null;
  for (var i; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) return i.__e;
  return typeof t.type == "function" ? Fe(t) : null;
}
function Zi(t) {
  var e, i;
  if ((t = t.__) != null && t.__c != null) {
    for (t.__e = t.__c.base = null, e = 0; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) {
      t.__e = t.__c.base = i.__e;
      break;
    }
    return Zi(t);
  }
}
function kt(t) {
  (!t.__d && (t.__d = !0) && Ce.push(t) && !lt.__r++ || di != C.debounceRendering) && ((di = C.debounceRendering) || qi)(lt);
}
function lt() {
  for (var t, e, i, n, r, o, a, l = 1; Ce.length; ) Ce.length > l && Ce.sort(ji), t = Ce.shift(), l = Ce.length, t.__d && (i = void 0, n = void 0, r = (n = (e = t).__v).__e, o = [], a = [], e.__P && ((i = de({}, n)).__v = n.__v + 1, C.vnode && C.vnode(i), Vt(e.__P, i, n, e.__n, e.__P.namespaceURI, 32 & n.__u ? [r] : null, o, r ?? Fe(n), !!(32 & n.__u), a), i.__v = n.__v, i.__.__k[i.__i] = i, nn(o, i, a), n.__e = n.__ = null, i.__e != r && Zi(i)));
  lt.__r = 0;
}
function en(t, e, i, n, r, o, a, l, d, c, h) {
  var u, p, m, y, v, E, w, b = n && n.__k || Ji, F = e.length;
  for (d = zn(i, e, b, d, F), u = 0; u < F; u++) (m = i.__k[u]) != null && (p = m.__i == -1 ? Qe : b[m.__i] || Qe, m.__i = u, E = Vt(t, m, p, r, o, a, l, d, c, h), y = m.__e, m.ref && p.ref != m.ref && (p.ref && qt(p.ref, null, m), h.push(m.ref, m.__c || y, m)), v == null && y != null && (v = y), (w = !!(4 & m.__u)) || p.__k === m.__k ? d = tn(m, d, t, w) : typeof m.type == "function" && E !== void 0 ? d = E : y && (d = y.nextSibling), m.__u &= -7);
  return i.__e = v, d;
}
function zn(t, e, i, n, r) {
  var o, a, l, d, c, h = i.length, u = h, p = 0;
  for (t.__k = new Array(r), o = 0; o < r; o++) (a = e[o]) != null && typeof a != "boolean" && typeof a != "function" ? (typeof a == "string" || typeof a == "number" || typeof a == "bigint" || a.constructor == String ? a = t.__k[o] = st(null, a, null, null, null) : qe(a) ? a = t.__k[o] = st(X, { children: a }, null, null, null) : a.constructor === void 0 && a.__b > 0 ? a = t.__k[o] = st(a.type, a.props, a.key, a.ref ? a.ref : null, a.__v) : t.__k[o] = a, d = o + p, a.__ = t, a.__b = t.__b + 1, l = null, (c = a.__i = Bn(a, i, d, u)) != -1 && (u--, (l = i[c]) && (l.__u |= 2)), l == null || l.__v == null ? (c == -1 && (r > h ? p-- : r < h && p++), typeof a.type != "function" && (a.__u |= 4)) : c != d && (c == d - 1 ? p-- : c == d + 1 ? p++ : (c > d ? p-- : p++, a.__u |= 4))) : t.__k[o] = null;
  if (u) for (o = 0; o < h; o++) (l = i[o]) != null && (2 & l.__u) == 0 && (l.__e == n && (n = Fe(l)), sn(l, l));
  return n;
}
function tn(t, e, i, n) {
  var r, o;
  if (typeof t.type == "function") {
    for (r = t.__k, o = 0; r && o < r.length; o++) r[o] && (r[o].__ = t, e = tn(r[o], e, i, n));
    return e;
  }
  t.__e != e && (n && (e && t.type && !e.parentNode && (e = Fe(t)), i.insertBefore(t.__e, e || null)), e = t.__e);
  do
    e = e && e.nextSibling;
  while (e != null && e.nodeType == 8);
  return e;
}
function ct(t, e) {
  return e = e || [], t == null || typeof t == "boolean" || (qe(t) ? t.some(function(i) {
    ct(i, e);
  }) : e.push(t)), e;
}
function Bn(t, e, i, n) {
  var r, o, a, l = t.key, d = t.type, c = e[i], h = c != null && (2 & c.__u) == 0;
  if (c === null && l == null || h && l == c.key && d == c.type) return i;
  if (n > (h ? 1 : 0)) {
    for (r = i - 1, o = i + 1; r >= 0 || o < e.length; ) if ((c = e[a = r >= 0 ? r-- : o++]) != null && (2 & c.__u) == 0 && l == c.key && d == c.type) return a;
  }
  return -1;
}
function ui(t, e, i) {
  e[0] == "-" ? t.setProperty(e, i ?? "") : t[e] = i == null ? "" : typeof i != "number" || Un.test(e) ? i : i + "px";
}
function Je(t, e, i, n, r) {
  var o, a;
  e: if (e == "style") if (typeof i == "string") t.style.cssText = i;
  else {
    if (typeof n == "string" && (t.style.cssText = n = ""), n) for (e in n) i && e in i || ui(t.style, e, "");
    if (i) for (e in i) n && i[e] == n[e] || ui(t.style, e, i[e]);
  }
  else if (e[0] == "o" && e[1] == "n") o = e != (e = e.replace(Yi, "$1")), a = e.toLowerCase(), e = a in t || e == "onFocusOut" || e == "onFocusIn" ? a.slice(2) : e.slice(2), t.l || (t.l = {}), t.l[e + o] = i, i ? n ? i.u = n.u : (i.u = Kt, t.addEventListener(e, o ? Tt : Ct, o)) : t.removeEventListener(e, o ? Tt : Ct, o);
  else {
    if (r == "http://www.w3.org/2000/svg") e = e.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if (e != "width" && e != "height" && e != "href" && e != "list" && e != "form" && e != "tabIndex" && e != "download" && e != "rowSpan" && e != "colSpan" && e != "role" && e != "popover" && e in t) try {
      t[e] = i ?? "";
      break e;
    } catch {
    }
    typeof i == "function" || (i == null || i === !1 && e[4] != "-" ? t.removeAttribute(e) : t.setAttribute(e, e == "popover" && i == 1 ? "" : i));
  }
}
function hi(t) {
  return function(e) {
    if (this.l) {
      var i = this.l[e.type + t];
      if (e.t == null) e.t = Kt++;
      else if (e.t < i.u) return;
      return i(C.event ? C.event(e) : e);
    }
  };
}
function Vt(t, e, i, n, r, o, a, l, d, c) {
  var h, u, p, m, y, v, E, w, b, F, U, G, D, N, T, P, K, L = e.type;
  if (e.constructor !== void 0) return null;
  128 & i.__u && (d = !!(32 & i.__u), o = [l = e.__e = i.__e]), (h = C.__b) && h(e);
  e: if (typeof L == "function") try {
    if (w = e.props, b = "prototype" in L && L.prototype.render, F = (h = L.contextType) && n[h.__c], U = h ? F ? F.props.value : h.__ : n, i.__c ? E = (u = e.__c = i.__c).__ = u.__E : (b ? e.__c = u = new L(w, U) : (e.__c = u = new ue(w, U), u.constructor = L, u.render = Gn), F && F.sub(u), u.state || (u.state = {}), u.__n = n, p = u.__d = !0, u.__h = [], u._sb = []), b && u.__s == null && (u.__s = u.state), b && L.getDerivedStateFromProps != null && (u.__s == u.state && (u.__s = de({}, u.__s)), de(u.__s, L.getDerivedStateFromProps(w, u.__s))), m = u.props, y = u.state, u.__v = e, p) b && L.getDerivedStateFromProps == null && u.componentWillMount != null && u.componentWillMount(), b && u.componentDidMount != null && u.__h.push(u.componentDidMount);
    else {
      if (b && L.getDerivedStateFromProps == null && w !== m && u.componentWillReceiveProps != null && u.componentWillReceiveProps(w, U), e.__v == i.__v || !u.__e && u.shouldComponentUpdate != null && u.shouldComponentUpdate(w, u.__s, U) === !1) {
        for (e.__v != i.__v && (u.props = w, u.state = u.__s, u.__d = !1), e.__e = i.__e, e.__k = i.__k, e.__k.some(function(S) {
          S && (S.__ = e);
        }), G = 0; G < u._sb.length; G++) u.__h.push(u._sb[G]);
        u._sb = [], u.__h.length && a.push(u);
        break e;
      }
      u.componentWillUpdate != null && u.componentWillUpdate(w, u.__s, U), b && u.componentDidUpdate != null && u.__h.push(function() {
        u.componentDidUpdate(m, y, v);
      });
    }
    if (u.context = U, u.props = w, u.__P = t, u.__e = !1, D = C.__r, N = 0, b) {
      for (u.state = u.__s, u.__d = !1, D && D(e), h = u.render(u.props, u.state, u.context), T = 0; T < u._sb.length; T++) u.__h.push(u._sb[T]);
      u._sb = [];
    } else do
      u.__d = !1, D && D(e), h = u.render(u.props, u.state, u.context), u.state = u.__s;
    while (u.__d && ++N < 25);
    u.state = u.__s, u.getChildContext != null && (n = de(de({}, n), u.getChildContext())), b && !p && u.getSnapshotBeforeUpdate != null && (v = u.getSnapshotBeforeUpdate(m, y)), P = h, h != null && h.type === X && h.key == null && (P = rn(h.props.children)), l = en(t, qe(P) ? P : [P], e, i, n, r, o, a, l, d, c), u.base = e.__e, e.__u &= -161, u.__h.length && a.push(u), E && (u.__E = u.__ = null);
  } catch (S) {
    if (e.__v = null, d || o != null) if (S.then) {
      for (e.__u |= d ? 160 : 128; l && l.nodeType == 8 && l.nextSibling; ) l = l.nextSibling;
      o[o.indexOf(l)] = null, e.__e = l;
    } else {
      for (K = o.length; K--; ) Qt(o[K]);
      Ot(e);
    }
    else e.__e = i.__e, e.__k = i.__k, S.then || Ot(e);
    C.__e(S, e, i);
  }
  else o == null && e.__v == i.__v ? (e.__k = i.__k, e.__e = i.__e) : l = e.__e = Hn(i.__e, e, i, n, r, o, a, d, c);
  return (h = C.diffed) && h(e), 128 & e.__u ? void 0 : l;
}
function Ot(t) {
  t && t.__c && (t.__c.__e = !0), t && t.__k && t.__k.forEach(Ot);
}
function nn(t, e, i) {
  for (var n = 0; n < i.length; n++) qt(i[n], i[++n], i[++n]);
  C.__c && C.__c(e, t), t.some(function(r) {
    try {
      t = r.__h, r.__h = [], t.some(function(o) {
        o.call(r);
      });
    } catch (o) {
      C.__e(o, r.__v);
    }
  });
}
function rn(t) {
  return typeof t != "object" || t == null || t.__b && t.__b > 0 ? t : qe(t) ? t.map(rn) : de({}, t);
}
function Hn(t, e, i, n, r, o, a, l, d) {
  var c, h, u, p, m, y, v, E = i.props || Qe, w = e.props, b = e.type;
  if (b == "svg" ? r = "http://www.w3.org/2000/svg" : b == "math" ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), o != null) {
    for (c = 0; c < o.length; c++) if ((m = o[c]) && "setAttribute" in m == !!b && (b ? m.localName == b : m.nodeType == 3)) {
      t = m, o[c] = null;
      break;
    }
  }
  if (t == null) {
    if (b == null) return document.createTextNode(w);
    t = document.createElementNS(r, b, w.is && w), l && (C.__m && C.__m(e, o), l = !1), o = null;
  }
  if (b == null) E === w || l && t.data == w || (t.data = w);
  else {
    if (o = o && pt.call(t.childNodes), !l && o != null) for (E = {}, c = 0; c < t.attributes.length; c++) E[(m = t.attributes[c]).name] = m.value;
    for (c in E) if (m = E[c], c != "children") {
      if (c == "dangerouslySetInnerHTML") u = m;
      else if (!(c in w)) {
        if (c == "value" && "defaultValue" in w || c == "checked" && "defaultChecked" in w) continue;
        Je(t, c, null, m, r);
      }
    }
    for (c in w) m = w[c], c == "children" ? p = m : c == "dangerouslySetInnerHTML" ? h = m : c == "value" ? y = m : c == "checked" ? v = m : l && typeof m != "function" || E[c] === m || Je(t, c, m, E[c], r);
    if (h) l || u && (h.__html == u.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), e.__k = [];
    else if (u && (t.innerHTML = ""), en(e.type == "template" ? t.content : t, qe(p) ? p : [p], e, i, n, b == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r, o, a, o ? o[0] : i.__k && Fe(i, 0), l, d), o != null) for (c = o.length; c--; ) Qt(o[c]);
    l || (c = "value", b == "progress" && y == null ? t.removeAttribute("value") : y != null && (y !== t[c] || b == "progress" && !y || b == "option" && y != E[c]) && Je(t, c, y, E[c], r), c = "checked", v != null && v != t[c] && Je(t, c, v, E[c], r));
  }
  return t;
}
function qt(t, e, i) {
  try {
    if (typeof t == "function") {
      var n = typeof t.__u == "function";
      n && t.__u(), n && e == null || (t.__u = t(e));
    } else t.current = e;
  } catch (r) {
    C.__e(r, i);
  }
}
function sn(t, e, i) {
  var n, r;
  if (C.unmount && C.unmount(t), (n = t.ref) && (n.current && n.current != t.__e || qt(n, null, e)), (n = t.__c) != null) {
    if (n.componentWillUnmount) try {
      n.componentWillUnmount();
    } catch (o) {
      C.__e(o, e);
    }
    n.base = n.__P = null;
  }
  if (n = t.__k) for (r = 0; r < n.length; r++) n[r] && sn(n[r], e, i || typeof t.type != "function");
  i || Qt(t.__e), t.__c = t.__ = t.__e = void 0;
}
function Gn(t, e, i) {
  return this.constructor(t, i);
}
function Ie(t, e, i) {
  var n, r, o, a;
  e == document && (e = document.documentElement), C.__ && C.__(t, e), r = (n = !1) ? null : e.__k, o = [], a = [], Vt(e, t = e.__k = It(X, null, [t]), r || Qe, Qe, e.namespaceURI, r ? null : e.firstChild ? pt.call(e.childNodes) : null, o, r ? r.__e : e.firstChild, n, a), nn(o, t, a);
}
function jt(t) {
  function e(i) {
    var n, r;
    return this.getChildContext || (n = /* @__PURE__ */ new Set(), (r = {})[e.__c] = this, this.getChildContext = function() {
      return r;
    }, this.componentWillUnmount = function() {
      n = null;
    }, this.shouldComponentUpdate = function(o) {
      this.props.value != o.value && n.forEach(function(a) {
        a.__e = !0, kt(a);
      });
    }, this.sub = function(o) {
      n.add(o);
      var a = o.componentWillUnmount;
      o.componentWillUnmount = function() {
        n && n.delete(o), a && a.call(o);
      };
    }), i.children;
  }
  return e.__c = "__cC" + Xi++, e.__ = t, e.Provider = e.__l = (e.Consumer = function(i, n) {
    return i.children(n);
  }).contextType = e, e;
}
pt = Ji.slice, C = { __e: function(t, e, i, n) {
  for (var r, o, a; e = e.__; ) if ((r = e.__c) && !r.__) try {
    if ((o = r.constructor) && o.getDerivedStateFromError != null && (r.setState(o.getDerivedStateFromError(t)), a = r.__d), r.componentDidCatch != null && (r.componentDidCatch(t, n || {}), a = r.__d), a) return r.__E = r;
  } catch (l) {
    t = l;
  }
  throw t;
} }, Vi = 0, ue.prototype.setState = function(t, e) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = de({}, this.state), typeof t == "function" && (t = t(de({}, i), this.props)), t && de(i, t), t != null && this.__v && (e && this._sb.push(e), kt(this));
}, ue.prototype.forceUpdate = function(t) {
  this.__v && (this.__e = !0, t && this.__h.push(t), kt(this));
}, ue.prototype.render = X, Ce = [], qi = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, ji = function(t, e) {
  return t.__v.__b - e.__v.__b;
}, lt.__r = 0, Yi = /(PointerCapture)$|Capture$/i, Kt = 0, Ct = hi(!1), Tt = hi(!0), Xi = 0;
var $n = 0;
function s(t, e, i, n, r, o) {
  e || (e = {});
  var a, l, d = e;
  if ("ref" in d) for (l in d = {}, e) l == "ref" ? a = e[l] : d[l] = e[l];
  var c = { type: t, props: d, key: i, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --$n, __i: -1, __u: 0, __source: r, __self: o };
  if (typeof t == "function" && (a = t.defaultProps)) for (l in a) d[l] === void 0 && (d[l] = a[l]);
  return C.vnode && C.vnode(c), c;
}
const I = {
  fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
  primary: "#3b82f6",
  text: "#111827",
  bg: "#ffffff",
  shadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  shadowHover: "0 6px 16px rgba(0, 0, 0, 0.2)",
  borderRadius: "8px",
  zIndex: {
    overlay: 999995,
    guides: 999996,
    tooltip: 999997,
    highlight: 999998,
    controls: 1e6,
    badge: 1000001,
    loading: 1000002
  }
};
function Wn({ guide: t, top: e, left: i, arrowStyle: n, onDismiss: r }) {
  return /* @__PURE__ */ s(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": t.id,
      style: {
        position: "absolute",
        background: I.bg,
        border: `2px solid ${I.primary}`,
        borderRadius: I.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: I.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: I.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: I.text,
        top: `${e}px`,
        left: `${i}px`,
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ s("div", { style: { marginBottom: 8 }, children: t.content }),
        /* @__PURE__ */ s(
          "button",
          {
            type: "button",
            onClick: r,
            style: {
              background: I.primary,
              color: I.bg,
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
        /* @__PURE__ */ s(
          "div",
          {
            className: "designer-guide-arrow",
            style: {
              position: "absolute",
              width: 0,
              height: 0,
              borderStyle: "solid",
              ...n
            }
          }
        )
      ]
    }
  );
}
var ke, z, yt, fi, dt = 0, on = [], B = C, pi = B.__b, mi = B.__r, gi = B.diffed, _i = B.__c, yi = B.unmount, vi = B.__;
function je(t, e) {
  B.__h && B.__h(z, t, dt || e), dt = 0;
  var i = z.__H || (z.__H = { __: [], __h: [] });
  return t >= i.__.length && i.__.push({}), i.__[t];
}
function x(t) {
  return dt = 1, Kn(an, t);
}
function Kn(t, e, i) {
  var n = je(ke++, 2);
  if (n.t = t, !n.__c && (n.__ = [i ? i(e) : an(void 0, e), function(l) {
    var d = n.__N ? n.__N[0] : n.__[0], c = n.t(d, l);
    d !== c && (n.__N = [c, n.__[1]], n.__c.setState({}));
  }], n.__c = z, !z.__f)) {
    var r = function(l, d, c) {
      if (!n.__c.__H) return !0;
      var h = n.__c.__H.__.filter(function(p) {
        return !!p.__c;
      });
      if (h.every(function(p) {
        return !p.__N;
      })) return !o || o.call(this, l, d, c);
      var u = n.__c.props !== l;
      return h.forEach(function(p) {
        if (p.__N) {
          var m = p.__[0];
          p.__ = p.__N, p.__N = void 0, m !== p.__[0] && (u = !0);
        }
      }), o && o.call(this, l, d, c) || u;
    };
    z.__f = !0;
    var o = z.shouldComponentUpdate, a = z.componentWillUpdate;
    z.componentWillUpdate = function(l, d, c) {
      if (this.__e) {
        var h = o;
        o = void 0, r(l, d, c), o = h;
      }
      a && a.call(this, l, d, c);
    }, z.shouldComponentUpdate = r;
  }
  return n.__N || n.__;
}
function V(t, e) {
  var i = je(ke++, 3);
  !B.__s && Xt(i.__H, e) && (i.__ = t, i.u = e, z.__H.__h.push(i));
}
function Qn(t, e) {
  var i = je(ke++, 4);
  !B.__s && Xt(i.__H, e) && (i.__ = t, i.u = e, z.__h.push(i));
}
function ut(t, e) {
  var i = je(ke++, 7);
  return Xt(i.__H, e) && (i.__ = t(), i.__H = e, i.__h = t), i.__;
}
function se(t, e) {
  return dt = 8, ut(function() {
    return t;
  }, e);
}
function Yt(t) {
  var e = z.context[t.__c], i = je(ke++, 9);
  return i.c = t, e ? (i.__ == null && (i.__ = !0, e.sub(z)), e.props.value) : t.__;
}
function Vn() {
  for (var t; t = on.shift(); ) if (t.__P && t.__H) try {
    t.__H.__h.forEach(ot), t.__H.__h.forEach(Rt), t.__H.__h = [];
  } catch (e) {
    t.__H.__h = [], B.__e(e, t.__v);
  }
}
B.__b = function(t) {
  z = null, pi && pi(t);
}, B.__ = function(t, e) {
  t && e.__k && e.__k.__m && (t.__m = e.__k.__m), vi && vi(t, e);
}, B.__r = function(t) {
  mi && mi(t), ke = 0;
  var e = (z = t.__c).__H;
  e && (yt === z ? (e.__h = [], z.__h = [], e.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (e.__h.forEach(ot), e.__h.forEach(Rt), e.__h = [], ke = 0)), yt = z;
}, B.diffed = function(t) {
  gi && gi(t);
  var e = t.__c;
  e && e.__H && (e.__H.__h.length && (on.push(e) !== 1 && fi === B.requestAnimationFrame || ((fi = B.requestAnimationFrame) || qn)(Vn)), e.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), yt = z = null;
}, B.__c = function(t, e) {
  e.some(function(i) {
    try {
      i.__h.forEach(ot), i.__h = i.__h.filter(function(n) {
        return !n.__ || Rt(n);
      });
    } catch (n) {
      e.some(function(r) {
        r.__h && (r.__h = []);
      }), e = [], B.__e(n, i.__v);
    }
  }), _i && _i(t, e);
}, B.unmount = function(t) {
  yi && yi(t);
  var e, i = t.__c;
  i && i.__H && (i.__H.__.forEach(function(n) {
    try {
      ot(n);
    } catch (r) {
      e = r;
    }
  }), i.__H = void 0, e && B.__e(e, i.__v));
};
var bi = typeof requestAnimationFrame == "function";
function qn(t) {
  var e, i = function() {
    clearTimeout(n), bi && cancelAnimationFrame(e), setTimeout(t);
  }, n = setTimeout(i, 35);
  bi && (e = requestAnimationFrame(i));
}
function ot(t) {
  var e = z, i = t.__c;
  typeof i == "function" && (t.__c = void 0, i()), z = e;
}
function Rt(t) {
  var e = z;
  t.__c = t.__(), z = e;
}
function Xt(t, e) {
  return !t || t.length !== e.length || e.some(function(i, n) {
    return i !== t[n];
  });
}
function an(t, e) {
  return typeof e == "function" ? e(t) : e;
}
const Pt = "Template", At = "Description", Dt = "Next";
function jn(t) {
  try {
    const e = JSON.parse(t || "{}");
    return {
      title: e.title ?? Pt,
      description: e.description ?? At,
      buttonContent: e.buttonContent ?? Dt
    };
  } catch {
    return {
      title: Pt,
      description: At,
      buttonContent: Dt
    };
  }
}
const Yn = {
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  paddingTop: 24,
  paddingRight: 16,
  paddingBottom: 24,
  paddingLeft: 16,
  fontFamily: I.fontFamily
};
function Xn({
  title: t = Pt,
  description: e = At,
  buttonContent: i = Dt,
  onNext: n
}) {
  return /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: 4, position: "relative" }, children: [
    /* @__PURE__ */ s("h3", { style: { fontSize: 14, fontWeight: 600, color: "#1855BC", lineHeight: 1.3, margin: 0 }, children: t }),
    /* @__PURE__ */ s("p", { style: { fontSize: 11, color: "#6b7280", lineHeight: 1.4, margin: 0 }, children: e }),
    /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "center", paddingTop: 4 }, children: /* @__PURE__ */ s(
      "button",
      {
        onClick: (r) => {
          r.stopPropagation(), n?.();
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
        onMouseEnter: (r) => r.currentTarget.style.opacity = "0.9",
        onMouseLeave: (r) => r.currentTarget.style.opacity = "1",
        children: i
      }
    ) })
  ] });
}
function Jn({ template: t, top: e, left: i, onDismiss: n, onNext: r }) {
  const o = ut(() => jn(t.template.content), [t.template.content]), l = t.template.template_key === "tooltip-scratch";
  return /* @__PURE__ */ s(
    "div",
    {
      style: {
        position: "absolute",
        top: `${e}px`,
        left: `${i}px`,
        zIndex: I.zIndex.tooltip,
        pointerEvents: "auto",
        maxWidth: 300
      },
      children: /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", margin: "0 auto", paddingTop: l ? 12 : 0 }, children: [
        l && /* @__PURE__ */ s(
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
            children: /* @__PURE__ */ s("iconify-icon", { icon: "iconamoon:arrow-up-2-light", style: { fontSize: 44, color: "#1855BC" } })
          }
        ),
        /* @__PURE__ */ s("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 8, ...Yn }, children: [
          /* @__PURE__ */ s(
            "div",
            {
              onClick: n,
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
              children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: 14 } })
            }
          ),
          /* @__PURE__ */ s(
            Xn,
            {
              title: o.title,
              description: o.description,
              buttonContent: o.buttonContent,
              onNext: r
            }
          )
        ] })
      ] })
    }
  );
}
function Zn(t) {
  const e = { position: "absolute" };
  switch (t) {
    case "top":
      return { ...e, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${I.primary} transparent transparent transparent` };
    case "bottom":
      return { ...e, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${I.primary} transparent` };
    case "left":
      return { ...e, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${I.primary}` };
    default:
      return { ...e, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${I.primary} transparent transparent` };
  }
}
function wi(t, e, i, n) {
  const r = t.getBoundingClientRect(), o = window.pageXOffset || document.documentElement.scrollLeft, a = window.pageYOffset || document.documentElement.scrollTop, l = window.innerWidth, d = window.innerHeight;
  let c = 0, h = 0;
  switch (e) {
    case "top":
      c = r.top + a - n - 12, h = r.left + o + r.width / 2 - i / 2;
      break;
    case "bottom":
      c = r.bottom + a + 12, h = r.left + o + r.width / 2 - i / 2;
      break;
    case "left":
      c = r.top + a + r.height / 2 - n / 2, h = r.left + o - i - 12;
      break;
    default:
      c = r.top + a + r.height / 2 - n / 2, h = r.right + o + 12;
      break;
  }
  return h < o ? h = o + 10 : h + i > o + l && (h = o + l - i - 10), c < a ? c = a + 10 : c + n > a + d && (c = a + d - n - 10), { top: c, left: h, arrowStyle: Zn(e) };
}
class er {
  container = null;
  onDismiss = () => {
  };
  onNext = () => {
  };
  lastGuides = [];
  triggeredGuide = null;
  currentStepIndex = 0;
  dismissedThisSession = /* @__PURE__ */ new Set();
  setOnDismiss(e) {
    this.onDismiss = e;
  }
  setOnNext(e) {
    this.onNext = e;
  }
  renderGuides(e) {
    this.lastGuides = e;
    const i = Le(), n = e.filter(
      (a) => a.page === i && a.status === "active" && !this.dismissedThisSession.has(a.id)
    );
    if (this.ensureContainer(), !this.container) return;
    const r = [], o = [];
    for (const a of n) {
      const l = Me.findElement(a.selector);
      if (!l) continue;
      li(l);
      const d = wi(l, a.placement, 280, 80);
      r.push({ guide: a, target: l, pos: d });
    }
    if (this.triggeredGuide && !this.dismissedThisSession.has(this.triggeredGuide.guide_id)) {
      const d = [...(this.triggeredGuide.templates || []).filter((c) => c.is_active)].sort((c, h) => c.step_order - h.step_order)[this.currentStepIndex];
      if (d && d.x_path) {
        const c = Me.findElement(d.x_path);
        if (c) {
          li(c);
          const h = wi(c, "bottom", 300, 160), u = c.getBoundingClientRect(), p = window.pageXOffset || document.documentElement.scrollLeft, m = u.left + p + u.width / 2;
          h.left = m - 16 - 16;
          const y = window.innerWidth;
          h.left < p + 10 ? h.left = p + 10 : h.left + 300 > p + y - 10 && (h.left = p + y - 300 - 10), o.push({ template: d, target: c, pos: h });
        } else
          console.warn(`[Visual Designer] Target element not found for template "${d.template_id}" using selector: ${d.x_path}`);
      }
    }
    if (r.length === 0 && o.length === 0) {
      Ie(null, this.container);
      return;
    }
    Ie(
      /* @__PURE__ */ s(
        "div",
        {
          id: "designer-guides-container",
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: I.zIndex.guides
          },
          children: [
            r.map(({ guide: a, pos: l }) => /* @__PURE__ */ s(
              Wn,
              {
                guide: a,
                top: l.top,
                left: l.left,
                arrowStyle: l.arrowStyle,
                onDismiss: () => this.dismissGuide(a.id)
              },
              a.id
            )),
            o.map(({ template: a, pos: l }) => /* @__PURE__ */ s(
              Jn,
              {
                template: a,
                top: l.top,
                left: l.left,
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext()
              },
              a.map_id
            ))
          ]
        }
      ),
      this.container
    );
  }
  renderTriggeredGuide(e) {
    console.log("[Visual Designer] Rendering Triggered Guide:", e), this.triggeredGuide = e, this.currentStepIndex = 0, this.dismissedThisSession.delete(e.guide_id), this.renderGuides(this.lastGuides);
  }
  handleNext() {
    if (!this.triggeredGuide) return;
    const i = [...(this.triggeredGuide.templates || []).filter((n) => n.is_active)].sort((n, r) => n.step_order - r.step_order);
    this.currentStepIndex < i.length - 1 ? (this.onNext(this.triggeredGuide.guide_id, this.currentStepIndex, i.length), this.currentStepIndex++, this.renderGuides(this.lastGuides)) : (this.onNext(this.triggeredGuide.guide_id, this.currentStepIndex, i.length), this.dismissTriggeredGuide());
  }
  dismissTriggeredGuide() {
    if (this.triggeredGuide) {
      const e = this.triggeredGuide.guide_id, i = this.currentStepIndex;
      this.dismissedThisSession.add(e), this.onDismiss(e, i), this.triggeredGuide = null, this.renderGuides(this.lastGuides);
    }
  }
  updatePositions(e) {
    this.renderGuides(e);
  }
  dismissGuide(e) {
    this.dismissedThisSession.add(e), this.onDismiss(e, 0), this.renderGuides(this.lastGuides);
  }
  clear() {
    this.dismissedThisSession.clear(), this.container && Ie(null, this.container);
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
      this.container = document.createElement("div"), this.container.id = "designer-guides-root", document.body.appendChild(this.container);
    }
  }
}
const Si = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function tr({ feature: t, color: e, rect: i }) {
  return /* @__PURE__ */ s(
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
        zIndex: I.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${e}`
      }
    }
  );
}
class ir {
  container = null;
  lastEnabled = !1;
  render(e, i) {
    if (this.lastEnabled = i, this.clear(), !i || e.length === 0) return;
    const n = e.filter((o) => (o.selector || "").trim() !== "");
    if (this.ensureContainer(), !this.container) return;
    const r = n.map((o, a) => {
      const l = Me.findElement(o.selector);
      if (!l) return null;
      const d = l.getBoundingClientRect(), c = Si[a % Si.length];
      return { feature: o, rect: d, color: c };
    }).filter(Boolean);
    r.length !== 0 && Ie(
      /* @__PURE__ */ s(
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
            zIndex: I.zIndex.overlay - 1
          },
          children: r.map(({ feature: o, rect: a, color: l }) => /* @__PURE__ */ s(
            tr,
            {
              feature: o,
              color: l,
              rect: {
                left: a.left,
                top: a.top,
                width: a.width,
                height: a.height
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
    this.container && Ie(null, this.container);
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
var Ne = class {
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
}, nr = {
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
}, rr = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = nr;
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
}, Te = new rr();
function sr(t) {
  setTimeout(t, 0);
}
var Oe = typeof window > "u" || "Deno" in globalThis;
function Y() {
}
function or(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function Lt(t) {
  return typeof t == "number" && t >= 0 && t !== 1 / 0;
}
function ln(t, e) {
  return Math.max(t + (e || 0) - Date.now(), 0);
}
function ye(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function re(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function Ei(t, e) {
  const {
    type: i = "all",
    exact: n,
    fetchStatus: r,
    predicate: o,
    queryKey: a,
    stale: l
  } = t;
  if (a) {
    if (n) {
      if (e.queryHash !== Jt(a, e.options))
        return !1;
    } else if (!Ve(e.queryKey, a))
      return !1;
  }
  if (i !== "all") {
    const d = e.isActive();
    if (i === "active" && !d || i === "inactive" && d)
      return !1;
  }
  return !(typeof l == "boolean" && e.isStale() !== l || r && r !== e.state.fetchStatus || o && !o(e));
}
function xi(t, e) {
  const { exact: i, status: n, predicate: r, mutationKey: o } = t;
  if (o) {
    if (!e.options.mutationKey)
      return !1;
    if (i) {
      if (Re(e.options.mutationKey) !== Re(o))
        return !1;
    } else if (!Ve(e.options.mutationKey, o))
      return !1;
  }
  return !(n && e.state.status !== n || r && !r(e));
}
function Jt(t, e) {
  return (e?.queryKeyHashFn || Re)(t);
}
function Re(t) {
  return JSON.stringify(
    t,
    (e, i) => Mt(i) ? Object.keys(i).sort().reduce((n, r) => (n[r] = i[r], n), {}) : i
  );
}
function Ve(t, e) {
  return t === e ? !0 : typeof t != typeof e ? !1 : t && e && typeof t == "object" && typeof e == "object" ? Object.keys(e).every((i) => Ve(t[i], e[i])) : !1;
}
var ar = Object.prototype.hasOwnProperty;
function cn(t, e, i = 0) {
  if (t === e)
    return t;
  if (i > 500) return e;
  const n = Ci(t) && Ci(e);
  if (!n && !(Mt(t) && Mt(e))) return e;
  const o = (n ? t : Object.keys(t)).length, a = n ? e : Object.keys(e), l = a.length, d = n ? new Array(l) : {};
  let c = 0;
  for (let h = 0; h < l; h++) {
    const u = n ? h : a[h], p = t[u], m = e[u];
    if (p === m) {
      d[u] = p, (n ? h < o : ar.call(t, u)) && c++;
      continue;
    }
    if (p === null || m === null || typeof p != "object" || typeof m != "object") {
      d[u] = m;
      continue;
    }
    const y = cn(p, m, i + 1);
    d[u] = y, y === p && c++;
  }
  return o === l && c === o ? t : d;
}
function ht(t, e) {
  if (!e || Object.keys(t).length !== Object.keys(e).length)
    return !1;
  for (const i in t)
    if (t[i] !== e[i])
      return !1;
  return !0;
}
function Ci(t) {
  return Array.isArray(t) && t.length === Object.keys(t).length;
}
function Mt(t) {
  if (!Ti(t))
    return !1;
  const e = t.constructor;
  if (e === void 0)
    return !0;
  const i = e.prototype;
  return !(!Ti(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(t) !== Object.prototype);
}
function Ti(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function lr(t) {
  return new Promise((e) => {
    Te.setTimeout(e, t);
  });
}
function Ft(t, e, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(t, e) : i.structuralSharing !== !1 ? cn(t, e) : e;
}
function cr(t, e, i = 0) {
  const n = [...t, e];
  return i && n.length > i ? n.slice(1) : n;
}
function dr(t, e, i = 0) {
  const n = [e, ...t];
  return i && n.length > i ? n.slice(0, -1) : n;
}
var Zt = /* @__PURE__ */ Symbol();
function dn(t, e) {
  return !t.queryFn && e?.initialPromise ? () => e.initialPromise : !t.queryFn || t.queryFn === Zt ? () => Promise.reject(new Error(`Missing queryFn: '${t.queryHash}'`)) : t.queryFn;
}
function ei(t, e) {
  return typeof t == "function" ? t(...e) : !!t;
}
function ur(t, e, i) {
  let n = !1, r;
  return Object.defineProperty(t, "signal", {
    enumerable: !0,
    get: () => (r ??= e(), n || (n = !0, r.aborted ? i() : r.addEventListener("abort", i, { once: !0 })), r)
  }), t;
}
var hr = class extends Ne {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!Oe && window.addEventListener) {
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
}, ti = new hr();
function Nt() {
  let t, e;
  const i = new Promise((r, o) => {
    t = r, e = o;
  });
  i.status = "pending", i.catch(() => {
  });
  function n(r) {
    Object.assign(i, r), delete i.resolve, delete i.reject;
  }
  return i.resolve = (r) => {
    n({
      status: "fulfilled",
      value: r
    }), t(r);
  }, i.reject = (r) => {
    n({
      status: "rejected",
      reason: r
    }), e(r);
  }, i;
}
var fr = sr;
function pr() {
  let t = [], e = 0, i = (l) => {
    l();
  }, n = (l) => {
    l();
  }, r = fr;
  const o = (l) => {
    e ? t.push(l) : r(() => {
      i(l);
    });
  }, a = () => {
    const l = t;
    t = [], l.length && r(() => {
      n(() => {
        l.forEach((d) => {
          i(d);
        });
      });
    });
  };
  return {
    batch: (l) => {
      let d;
      e++;
      try {
        d = l();
      } finally {
        e--, e || a();
      }
      return d;
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: (l) => (...d) => {
      o(() => {
        l(...d);
      });
    },
    schedule: o,
    /**
     * Use this method to set a custom notify function.
     * This can be used to for example wrap notifications with `React.act` while running tests.
     */
    setNotifyFunction: (l) => {
      i = l;
    },
    /**
     * Use this method to set a custom function to batch notifications together into a single tick.
     * By default React Query will use the batch function provided by ReactDOM or React Native.
     */
    setBatchNotifyFunction: (l) => {
      n = l;
    },
    setScheduler: (l) => {
      r = l;
    }
  };
}
var H = pr(), mr = class extends Ne {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!Oe && window.addEventListener) {
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
}, ft = new mr();
function gr(t) {
  return Math.min(1e3 * 2 ** t, 3e4);
}
function un(t) {
  return (t ?? "online") === "online" ? ft.isOnline() : !0;
}
var Ut = class extends Error {
  constructor(t) {
    super("CancelledError"), this.revert = t?.revert, this.silent = t?.silent;
  }
};
function hn(t) {
  let e = !1, i = 0, n;
  const r = Nt(), o = () => r.status !== "pending", a = (v) => {
    if (!o()) {
      const E = new Ut(v);
      p(E), t.onCancel?.(E);
    }
  }, l = () => {
    e = !0;
  }, d = () => {
    e = !1;
  }, c = () => ti.isFocused() && (t.networkMode === "always" || ft.isOnline()) && t.canRun(), h = () => un(t.networkMode) && t.canRun(), u = (v) => {
    o() || (n?.(), r.resolve(v));
  }, p = (v) => {
    o() || (n?.(), r.reject(v));
  }, m = () => new Promise((v) => {
    n = (E) => {
      (o() || c()) && v(E);
    }, t.onPause?.();
  }).then(() => {
    n = void 0, o() || t.onContinue?.();
  }), y = () => {
    if (o())
      return;
    let v;
    const E = i === 0 ? t.initialPromise : void 0;
    try {
      v = E ?? t.fn();
    } catch (w) {
      v = Promise.reject(w);
    }
    Promise.resolve(v).then(u).catch((w) => {
      if (o())
        return;
      const b = t.retry ?? (Oe ? 0 : 3), F = t.retryDelay ?? gr, U = typeof F == "function" ? F(i, w) : F, G = b === !0 || typeof b == "number" && i < b || typeof b == "function" && b(i, w);
      if (e || !G) {
        p(w);
        return;
      }
      i++, t.onFail?.(i, w), lr(U).then(() => c() ? void 0 : m()).then(() => {
        e ? p(w) : y();
      });
    });
  };
  return {
    promise: r,
    status: () => r.status,
    cancel: a,
    continue: () => (n?.(), r),
    cancelRetry: l,
    continueRetry: d,
    canStart: h,
    start: () => (h() ? y() : m().then(y), r)
  };
}
var fn = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), Lt(this.gcTime) && (this.#e = Te.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(t) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      t ?? (Oe ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (Te.clearTimeout(this.#e), this.#e = void 0);
  }
}, _r = class extends fn {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(t) {
    super(), this.#a = !1, this.#o = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.#r = t.client, this.#i = this.#r.getQueryCache(), this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.#e = ki(this.options), this.state = t.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(t) {
    if (this.options = { ...this.#o, ...t }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const e = ki(this.options);
      e.data !== void 0 && (this.setState(
        Ii(e.data, e.dataUpdatedAt)
      ), this.#e = e);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(t, e) {
    const i = Ft(this.state.data, t, this.options);
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
    return this.#n?.cancel(t), e ? e.then(Y).catch(Y) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({ silent: !0 });
  }
  reset() {
    this.destroy(), this.setState(this.#e);
  }
  isActive() {
    return this.observers.some(
      (t) => re(t.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === Zt || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => ye(t.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => t.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(t = 0) {
    return this.state.data === void 0 ? !0 : t === "static" ? !1 : this.state.isInvalidated ? !0 : !ln(this.state.dataUpdatedAt, t);
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
      const l = this.observers.find((d) => d.options.queryFn);
      l && this.setOptions(l.options);
    }
    const i = new AbortController(), n = (l) => {
      Object.defineProperty(l, "signal", {
        enumerable: !0,
        get: () => (this.#a = !0, i.signal)
      });
    }, r = () => {
      const l = dn(this.options, e), c = (() => {
        const h = {
          client: this.#r,
          queryKey: this.queryKey,
          meta: this.meta
        };
        return n(h), h;
      })();
      return this.#a = !1, this.options.persister ? this.options.persister(
        l,
        c,
        this
      ) : l(c);
    }, a = (() => {
      const l = {
        fetchOptions: e,
        options: this.options,
        queryKey: this.queryKey,
        client: this.#r,
        state: this.state,
        fetchFn: r
      };
      return n(l), l;
    })();
    this.options.behavior?.onFetch(a, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#s({ type: "fetch", meta: a.fetchOptions?.meta }), this.#n = hn({
      initialPromise: e?.initialPromise,
      fn: a.fetchFn,
      onCancel: (l) => {
        l instanceof Ut && l.revert && this.setState({
          ...this.#t,
          fetchStatus: "idle"
        }), i.abort();
      },
      onFail: (l, d) => {
        this.#s({ type: "failed", failureCount: l, error: d });
      },
      onPause: () => {
        this.#s({ type: "pause" });
      },
      onContinue: () => {
        this.#s({ type: "continue" });
      },
      retry: a.options.retry,
      retryDelay: a.options.retryDelay,
      networkMode: a.options.networkMode,
      canRun: () => !0
    });
    try {
      const l = await this.#n.start();
      if (l === void 0)
        throw new Error(`${this.queryHash} data is undefined`);
      return this.setData(l), this.#i.config.onSuccess?.(l, this), this.#i.config.onSettled?.(
        l,
        this.state.error,
        this
      ), l;
    } catch (l) {
      if (l instanceof Ut) {
        if (l.silent)
          return this.#n.promise;
        if (l.revert) {
          if (this.state.data === void 0)
            throw l;
          return this.state.data;
        }
      }
      throw this.#s({
        type: "error",
        error: l
      }), this.#i.config.onError?.(
        l,
        this
      ), this.#i.config.onSettled?.(
        this.state.data,
        l,
        this
      ), l;
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
            ...pn(i.data, this.options),
            fetchMeta: t.meta ?? null
          };
        case "success":
          const n = {
            ...i,
            ...Ii(t.data, t.dataUpdatedAt),
            dataUpdateCount: i.dataUpdateCount + 1,
            ...!t.manual && {
              fetchStatus: "idle",
              fetchFailureCount: 0,
              fetchFailureReason: null
            }
          };
          return this.#t = t.manual ? n : void 0, n;
        case "error":
          const r = t.error;
          return {
            ...i,
            error: r,
            errorUpdateCount: i.errorUpdateCount + 1,
            errorUpdatedAt: Date.now(),
            fetchFailureCount: i.fetchFailureCount + 1,
            fetchFailureReason: r,
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
    this.state = e(this.state), H.batch(() => {
      this.observers.forEach((i) => {
        i.onQueryUpdate();
      }), this.#i.notify({ query: this, type: "updated", action: t });
    });
  }
};
function pn(t, e) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: un(e.networkMode) ? "fetching" : "paused",
    ...t === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function Ii(t, e) {
  return {
    data: t,
    dataUpdatedAt: e ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function ki(t) {
  const e = typeof t.initialData == "function" ? t.initialData() : t.initialData, i = e !== void 0, n = i ? typeof t.initialDataUpdatedAt == "function" ? t.initialDataUpdatedAt() : t.initialDataUpdatedAt : 0;
  return {
    data: e,
    dataUpdateCount: 0,
    dataUpdatedAt: i ? n ?? Date.now() : 0,
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
var yr = class extends Ne {
  constructor(t, e) {
    super(), this.options = e, this.#e = t, this.#s = null, this.#a = Nt(), this.bindMethods(), this.setOptions(e);
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
  #f;
  #c;
  #d;
  #l;
  #p = /* @__PURE__ */ new Set();
  bindMethods() {
    this.refetch = this.refetch.bind(this);
  }
  onSubscribe() {
    this.listeners.size === 1 && (this.#t.addObserver(this), Oi(this.#t, this.options) ? this.#u() : this.updateResult(), this.#v());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return zt(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return zt(
      this.#t,
      this.options,
      this.options.refetchOnWindowFocus
    );
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set(), this.#b(), this.#w(), this.#t.removeObserver(this);
  }
  setOptions(t) {
    const e = this.options, i = this.#t;
    if (this.options = this.#e.defaultQueryOptions(t), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof re(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), e._defaulted && !ht(this.options, e) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const n = this.hasListeners();
    n && Ri(
      this.#t,
      i,
      this.options,
      e
    ) && this.#u(), this.updateResult(), n && (this.#t !== i || re(this.options.enabled, this.#t) !== re(e.enabled, this.#t) || ye(this.options.staleTime, this.#t) !== ye(e.staleTime, this.#t)) && this.#g();
    const r = this.#_();
    n && (this.#t !== i || re(this.options.enabled, this.#t) !== re(e.enabled, this.#t) || r !== this.#l) && this.#y(r);
  }
  getOptimisticResult(t) {
    const e = this.#e.getQueryCache().build(this.#e, t), i = this.createResult(e, t);
    return br(this, i) && (this.#r = i, this.#o = this.options, this.#n = this.#t.state), i;
  }
  getCurrentResult() {
    return this.#r;
  }
  trackResult(t, e) {
    return new Proxy(t, {
      get: (i, n) => (this.trackProp(n), e?.(n), n === "promise" && (this.trackProp("data"), !this.options.experimental_prefetchInRender && this.#a.status === "pending" && this.#a.reject(
        new Error(
          "experimental_prefetchInRender feature flag is not enabled"
        )
      )), Reflect.get(i, n))
    });
  }
  trackProp(t) {
    this.#p.add(t);
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
    return t?.throwOnError || (e = e.catch(Y)), e;
  }
  #g() {
    this.#b();
    const t = ye(
      this.options.staleTime,
      this.#t
    );
    if (Oe || this.#r.isStale || !Lt(t))
      return;
    const i = ln(this.#r.dataUpdatedAt, t) + 1;
    this.#c = Te.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #_() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #y(t) {
    this.#w(), this.#l = t, !(Oe || re(this.options.enabled, this.#t) === !1 || !Lt(this.#l) || this.#l === 0) && (this.#d = Te.setInterval(() => {
      (this.options.refetchIntervalInBackground || ti.isFocused()) && this.#u();
    }, this.#l));
  }
  #v() {
    this.#g(), this.#y(this.#_());
  }
  #b() {
    this.#c && (Te.clearTimeout(this.#c), this.#c = void 0);
  }
  #w() {
    this.#d && (Te.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(t, e) {
    const i = this.#t, n = this.options, r = this.#r, o = this.#n, a = this.#o, d = t !== i ? t.state : this.#i, { state: c } = t;
    let h = { ...c }, u = !1, p;
    if (e._optimisticResults) {
      const T = this.hasListeners(), P = !T && Oi(t, e), K = T && Ri(t, i, e, n);
      (P || K) && (h = {
        ...h,
        ...pn(c.data, t.options)
      }), e._optimisticResults === "isRestoring" && (h.fetchStatus = "idle");
    }
    let { error: m, errorUpdatedAt: y, status: v } = h;
    p = h.data;
    let E = !1;
    if (e.placeholderData !== void 0 && p === void 0 && v === "pending") {
      let T;
      r?.isPlaceholderData && e.placeholderData === a?.placeholderData ? (T = r.data, E = !0) : T = typeof e.placeholderData == "function" ? e.placeholderData(
        this.#f?.state.data,
        this.#f
      ) : e.placeholderData, T !== void 0 && (v = "success", p = Ft(
        r?.data,
        T,
        e
      ), u = !0);
    }
    if (e.select && p !== void 0 && !E)
      if (r && p === o?.data && e.select === this.#m)
        p = this.#h;
      else
        try {
          this.#m = e.select, p = e.select(p), p = Ft(r?.data, p, e), this.#h = p, this.#s = null;
        } catch (T) {
          this.#s = T;
        }
    this.#s && (m = this.#s, p = this.#h, y = Date.now(), v = "error");
    const w = h.fetchStatus === "fetching", b = v === "pending", F = v === "error", U = b && w, G = p !== void 0, N = {
      status: v,
      fetchStatus: h.fetchStatus,
      isPending: b,
      isSuccess: v === "success",
      isError: F,
      isInitialLoading: U,
      isLoading: U,
      data: p,
      dataUpdatedAt: h.dataUpdatedAt,
      error: m,
      errorUpdatedAt: y,
      failureCount: h.fetchFailureCount,
      failureReason: h.fetchFailureReason,
      errorUpdateCount: h.errorUpdateCount,
      isFetched: h.dataUpdateCount > 0 || h.errorUpdateCount > 0,
      isFetchedAfterMount: h.dataUpdateCount > d.dataUpdateCount || h.errorUpdateCount > d.errorUpdateCount,
      isFetching: w,
      isRefetching: w && !b,
      isLoadingError: F && !G,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: u,
      isRefetchError: F && G,
      isStale: ii(t, e),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: re(e.enabled, t) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const T = N.data !== void 0, P = N.status === "error" && !T, K = ($) => {
        P ? $.reject(N.error) : T && $.resolve(N.data);
      }, L = () => {
        const $ = this.#a = N.promise = Nt();
        K($);
      }, S = this.#a;
      switch (S.status) {
        case "pending":
          t.queryHash === i.queryHash && K(S);
          break;
        case "fulfilled":
          (P || N.data !== S.value) && L();
          break;
        case "rejected":
          (!P || N.error !== S.reason) && L();
          break;
      }
    }
    return N;
  }
  updateResult() {
    const t = this.#r, e = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#f = this.#t), ht(e, t))
      return;
    this.#r = e;
    const i = () => {
      if (!t)
        return !0;
      const { notifyOnChangeProps: n } = this.options, r = typeof n == "function" ? n() : n;
      if (r === "all" || !r && !this.#p.size)
        return !0;
      const o = new Set(
        r ?? this.#p
      );
      return this.options.throwOnError && o.add("error"), Object.keys(this.#r).some((a) => {
        const l = a;
        return this.#r[l] !== t[l] && o.has(l);
      });
    };
    this.#E({ listeners: i() });
  }
  #S() {
    const t = this.#e.getQueryCache().build(this.#e, this.options);
    if (t === this.#t)
      return;
    const e = this.#t;
    this.#t = t, this.#i = t.state, this.hasListeners() && (e?.removeObserver(this), t.addObserver(this));
  }
  onQueryUpdate() {
    this.updateResult(), this.hasListeners() && this.#v();
  }
  #E(t) {
    H.batch(() => {
      t.listeners && this.listeners.forEach((e) => {
        e(this.#r);
      }), this.#e.getQueryCache().notify({
        query: this.#t,
        type: "observerResultsUpdated"
      });
    });
  }
};
function vr(t, e) {
  return re(e.enabled, t) !== !1 && t.state.data === void 0 && !(t.state.status === "error" && e.retryOnMount === !1);
}
function Oi(t, e) {
  return vr(t, e) || t.state.data !== void 0 && zt(t, e, e.refetchOnMount);
}
function zt(t, e, i) {
  if (re(e.enabled, t) !== !1 && ye(e.staleTime, t) !== "static") {
    const n = typeof i == "function" ? i(t) : i;
    return n === "always" || n !== !1 && ii(t, e);
  }
  return !1;
}
function Ri(t, e, i, n) {
  return (t !== e || re(n.enabled, t) === !1) && (!i.suspense || t.state.status !== "error") && ii(t, i);
}
function ii(t, e) {
  return re(e.enabled, t) !== !1 && t.isStaleByTime(ye(e.staleTime, t));
}
function br(t, e) {
  return !ht(t.getCurrentResult(), e);
}
function Pi(t) {
  return {
    onFetch: (e, i) => {
      const n = e.options, r = e.fetchOptions?.meta?.fetchMore?.direction, o = e.state.data?.pages || [], a = e.state.data?.pageParams || [];
      let l = { pages: [], pageParams: [] }, d = 0;
      const c = async () => {
        let h = !1;
        const u = (y) => {
          ur(
            y,
            () => e.signal,
            () => h = !0
          );
        }, p = dn(e.options, e.fetchOptions), m = async (y, v, E) => {
          if (h)
            return Promise.reject();
          if (v == null && y.pages.length)
            return Promise.resolve(y);
          const b = (() => {
            const D = {
              client: e.client,
              queryKey: e.queryKey,
              pageParam: v,
              direction: E ? "backward" : "forward",
              meta: e.options.meta
            };
            return u(D), D;
          })(), F = await p(b), { maxPages: U } = e.options, G = E ? dr : cr;
          return {
            pages: G(y.pages, F, U),
            pageParams: G(y.pageParams, v, U)
          };
        };
        if (r && o.length) {
          const y = r === "backward", v = y ? wr : Ai, E = {
            pages: o,
            pageParams: a
          }, w = v(n, E);
          l = await m(E, w, y);
        } else {
          const y = t ?? o.length;
          do {
            const v = d === 0 ? a[0] ?? n.initialPageParam : Ai(n, l);
            if (d > 0 && v == null)
              break;
            l = await m(l, v), d++;
          } while (d < y);
        }
        return l;
      };
      e.options.persister ? e.fetchFn = () => e.options.persister?.(
        c,
        {
          client: e.client,
          queryKey: e.queryKey,
          meta: e.options.meta,
          signal: e.signal
        },
        i
      ) : e.fetchFn = c;
    }
  };
}
function Ai(t, { pages: e, pageParams: i }) {
  const n = e.length - 1;
  return e.length > 0 ? t.getNextPageParam(
    e[n],
    e,
    i[n],
    i
  ) : void 0;
}
function wr(t, { pages: e, pageParams: i }) {
  return e.length > 0 ? t.getPreviousPageParam?.(e[0], e, i[0], i) : void 0;
}
var Sr = class extends fn {
  #e;
  #t;
  #i;
  #r;
  constructor(t) {
    super(), this.#e = t.client, this.mutationId = t.mutationId, this.#i = t.mutationCache, this.#t = [], this.state = t.state || mn(), this.setOptions(t.options), this.scheduleGc();
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
    this.#r = hn({
      fn: () => this.options.mutationFn ? this.options.mutationFn(t, i) : Promise.reject(new Error("No mutationFn found")),
      onFail: (o, a) => {
        this.#n({ type: "failed", failureCount: o, error: a });
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
    const n = this.state.status === "pending", r = !this.#r.canStart();
    try {
      if (n)
        e();
      else {
        this.#n({ type: "pending", variables: t, isPaused: r }), this.#i.config.onMutate && await this.#i.config.onMutate(
          t,
          this,
          i
        );
        const a = await this.options.onMutate?.(
          t,
          i
        );
        a !== this.state.context && this.#n({
          type: "pending",
          context: a,
          variables: t,
          isPaused: r
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
      } catch (a) {
        Promise.reject(a);
      }
      try {
        await this.options.onError?.(
          o,
          t,
          this.state.context,
          i
        );
      } catch (a) {
        Promise.reject(a);
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
      } catch (a) {
        Promise.reject(a);
      }
      try {
        await this.options.onSettled?.(
          void 0,
          o,
          t,
          this.state.context,
          i
        );
      } catch (a) {
        Promise.reject(a);
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
    this.state = e(this.state), H.batch(() => {
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
function mn() {
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
var Er = class extends Ne {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(t, e, i) {
    const n = new Sr({
      client: t,
      mutationCache: this,
      mutationId: ++this.#i,
      options: t.defaultMutationOptions(e),
      state: i
    });
    return this.add(n), n;
  }
  add(t) {
    this.#e.add(t);
    const e = Ze(t);
    if (typeof e == "string") {
      const i = this.#t.get(e);
      i ? i.push(t) : this.#t.set(e, [t]);
    }
    this.notify({ type: "added", mutation: t });
  }
  remove(t) {
    if (this.#e.delete(t)) {
      const e = Ze(t);
      if (typeof e == "string") {
        const i = this.#t.get(e);
        if (i)
          if (i.length > 1) {
            const n = i.indexOf(t);
            n !== -1 && i.splice(n, 1);
          } else i[0] === t && this.#t.delete(e);
      }
    }
    this.notify({ type: "removed", mutation: t });
  }
  canRun(t) {
    const e = Ze(t);
    if (typeof e == "string") {
      const n = this.#t.get(e)?.find(
        (r) => r.state.status === "pending"
      );
      return !n || n === t;
    } else
      return !0;
  }
  runNext(t) {
    const e = Ze(t);
    return typeof e == "string" ? this.#t.get(e)?.find((n) => n !== t && n.state.isPaused)?.continue() ?? Promise.resolve() : Promise.resolve();
  }
  clear() {
    H.batch(() => {
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
      (i) => xi(e, i)
    );
  }
  findAll(t = {}) {
    return this.getAll().filter((e) => xi(t, e));
  }
  notify(t) {
    H.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  resumePausedMutations() {
    const t = this.getAll().filter((e) => e.state.isPaused);
    return H.batch(
      () => Promise.all(
        t.map((e) => e.continue().catch(Y))
      )
    );
  }
};
function Ze(t) {
  return t.options.scope?.id;
}
var xr = class extends Ne {
  #e;
  #t = void 0;
  #i;
  #r;
  constructor(t, e) {
    super(), this.#e = t, this.setOptions(e), this.bindMethods(), this.#n();
  }
  bindMethods() {
    this.mutate = this.mutate.bind(this), this.reset = this.reset.bind(this);
  }
  setOptions(t) {
    const e = this.options;
    this.options = this.#e.defaultMutationOptions(t), ht(this.options, e) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), e?.mutationKey && this.options.mutationKey && Re(e.mutationKey) !== Re(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
  }
  onUnsubscribe() {
    this.hasListeners() || this.#i?.removeObserver(this);
  }
  onMutationUpdate(t) {
    this.#n(), this.#o(t);
  }
  getCurrentResult() {
    return this.#t;
  }
  reset() {
    this.#i?.removeObserver(this), this.#i = void 0, this.#n(), this.#o();
  }
  mutate(t, e) {
    return this.#r = e, this.#i?.removeObserver(this), this.#i = this.#e.getMutationCache().build(this.#e, this.options), this.#i.addObserver(this), this.#i.execute(t);
  }
  #n() {
    const t = this.#i?.state ?? mn();
    this.#t = {
      ...t,
      isPending: t.status === "pending",
      isSuccess: t.status === "success",
      isError: t.status === "error",
      isIdle: t.status === "idle",
      mutate: this.mutate,
      reset: this.reset
    };
  }
  #o(t) {
    H.batch(() => {
      if (this.#r && this.hasListeners()) {
        const e = this.#t.variables, i = this.#t.context, n = {
          client: this.#e,
          meta: this.options.meta,
          mutationKey: this.options.mutationKey
        };
        if (t?.type === "success") {
          try {
            this.#r.onSuccess?.(
              t.data,
              e,
              i,
              n
            );
          } catch (r) {
            Promise.reject(r);
          }
          try {
            this.#r.onSettled?.(
              t.data,
              null,
              e,
              i,
              n
            );
          } catch (r) {
            Promise.reject(r);
          }
        } else if (t?.type === "error") {
          try {
            this.#r.onError?.(
              t.error,
              e,
              i,
              n
            );
          } catch (r) {
            Promise.reject(r);
          }
          try {
            this.#r.onSettled?.(
              void 0,
              t.error,
              e,
              i,
              n
            );
          } catch (r) {
            Promise.reject(r);
          }
        }
      }
      this.listeners.forEach((e) => {
        e(this.#t);
      });
    });
  }
}, Cr = class extends Ne {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(t, e, i) {
    const n = e.queryKey, r = e.queryHash ?? Jt(n, e);
    let o = this.get(r);
    return o || (o = new _r({
      client: t,
      queryKey: n,
      queryHash: r,
      options: t.defaultQueryOptions(e),
      state: i,
      defaultOptions: t.getQueryDefaults(n)
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
    H.batch(() => {
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
      (i) => Ei(e, i)
    );
  }
  findAll(t = {}) {
    const e = this.getAll();
    return Object.keys(t).length > 0 ? e.filter((i) => Ei(t, i)) : e;
  }
  notify(t) {
    H.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  onFocus() {
    H.batch(() => {
      this.getAll().forEach((t) => {
        t.onFocus();
      });
    });
  }
  onOnline() {
    H.batch(() => {
      this.getAll().forEach((t) => {
        t.onOnline();
      });
    });
  }
}, Tr = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  #s;
  constructor(t = {}) {
    this.#e = t.queryCache || new Cr(), this.#t = t.mutationCache || new Er(), this.#i = t.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = ti.subscribe(async (t) => {
      t && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = ft.subscribe(async (t) => {
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
    const e = this.defaultQueryOptions(t), i = this.#e.build(this, e), n = i.state.data;
    return n === void 0 ? this.fetchQuery(t) : (t.revalidateIfStale && i.isStaleByTime(ye(e.staleTime, i)) && this.prefetchQuery(e), Promise.resolve(n));
  }
  getQueriesData(t) {
    return this.#e.findAll(t).map(({ queryKey: e, state: i }) => {
      const n = i.data;
      return [e, n];
    });
  }
  setQueryData(t, e, i) {
    const n = this.defaultQueryOptions({ queryKey: t }), o = this.#e.get(
      n.queryHash
    )?.state.data, a = or(e, o);
    if (a !== void 0)
      return this.#e.build(this, n).setData(a, { ...i, manual: !0 });
  }
  setQueriesData(t, e, i) {
    return H.batch(
      () => this.#e.findAll(t).map(({ queryKey: n }) => [
        n,
        this.setQueryData(n, e, i)
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
    H.batch(() => {
      e.findAll(t).forEach((i) => {
        e.remove(i);
      });
    });
  }
  resetQueries(t, e) {
    const i = this.#e;
    return H.batch(() => (i.findAll(t).forEach((n) => {
      n.reset();
    }), this.refetchQueries(
      {
        type: "active",
        ...t
      },
      e
    )));
  }
  cancelQueries(t, e = {}) {
    const i = { revert: !0, ...e }, n = H.batch(
      () => this.#e.findAll(t).map((r) => r.cancel(i))
    );
    return Promise.all(n).then(Y).catch(Y);
  }
  invalidateQueries(t, e = {}) {
    return H.batch(() => (this.#e.findAll(t).forEach((i) => {
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
    }, n = H.batch(
      () => this.#e.findAll(t).filter((r) => !r.isDisabled() && !r.isStatic()).map((r) => {
        let o = r.fetch(void 0, i);
        return i.throwOnError || (o = o.catch(Y)), r.state.fetchStatus === "paused" ? Promise.resolve() : o;
      })
    );
    return Promise.all(n).then(Y);
  }
  fetchQuery(t) {
    const e = this.defaultQueryOptions(t);
    e.retry === void 0 && (e.retry = !1);
    const i = this.#e.build(this, e);
    return i.isStaleByTime(
      ye(e.staleTime, i)
    ) ? i.fetch(e) : Promise.resolve(i.state.data);
  }
  prefetchQuery(t) {
    return this.fetchQuery(t).then(Y).catch(Y);
  }
  fetchInfiniteQuery(t) {
    return t.behavior = Pi(t.pages), this.fetchQuery(t);
  }
  prefetchInfiniteQuery(t) {
    return this.fetchInfiniteQuery(t).then(Y).catch(Y);
  }
  ensureInfiniteQueryData(t) {
    return t.behavior = Pi(t.pages), this.ensureQueryData(t);
  }
  resumePausedMutations() {
    return ft.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
    this.#r.set(Re(t), {
      queryKey: t,
      defaultOptions: e
    });
  }
  getQueryDefaults(t) {
    const e = [...this.#r.values()], i = {};
    return e.forEach((n) => {
      Ve(t, n.queryKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  setMutationDefaults(t, e) {
    this.#n.set(Re(t), {
      mutationKey: t,
      defaultOptions: e
    });
  }
  getMutationDefaults(t) {
    const e = [...this.#n.values()], i = {};
    return e.forEach((n) => {
      Ve(t, n.mutationKey) && Object.assign(i, n.defaultOptions);
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
    return e.queryHash || (e.queryHash = Jt(
      e.queryKey,
      e
    )), e.refetchOnReconnect === void 0 && (e.refetchOnReconnect = e.networkMode !== "always"), e.throwOnError === void 0 && (e.throwOnError = !!e.suspense), !e.networkMode && e.persister && (e.networkMode = "offlineFirst"), e.queryFn === Zt && (e.enabled = !1), e;
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
function Ir(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function Di(t, e) {
  for (var i in t) if (i !== "__source" && !(i in e)) return !0;
  for (var n in e) if (n !== "__source" && t[n] !== e[n]) return !0;
  return !1;
}
function gn(t, e) {
  var i = e(), n = x({ t: { __: i, u: e } }), r = n[0].t, o = n[1];
  return Qn(function() {
    r.__ = i, r.u = e, vt(r) && o({ t: r });
  }, [t, i, e]), V(function() {
    return vt(r) && o({ t: r }), t(function() {
      vt(r) && o({ t: r });
    });
  }, [t]), i;
}
function vt(t) {
  var e, i, n = t.u, r = t.__;
  try {
    var o = n();
    return !((e = r) === (i = o) && (e !== 0 || 1 / e == 1 / i) || e != e && i != i);
  } catch {
    return !0;
  }
}
function Li(t, e) {
  this.props = t, this.context = e;
}
(Li.prototype = new ue()).isPureReactComponent = !0, Li.prototype.shouldComponentUpdate = function(t, e) {
  return Di(this.props, t) || Di(this.state, e);
};
var Mi = C.__b;
C.__b = function(t) {
  t.type && t.type.__f && t.ref && (t.props.ref = t.ref, t.ref = null), Mi && Mi(t);
};
var kr = C.__e;
C.__e = function(t, e, i, n) {
  if (t.then) {
    for (var r, o = e; o = o.__; ) if ((r = o.__c) && r.__c) return e.__e == null && (e.__e = i.__e, e.__k = i.__k), r.__c(t, e);
  }
  kr(t, e, i, n);
};
var Fi = C.unmount;
function _n(t, e, i) {
  return t && (t.__c && t.__c.__H && (t.__c.__H.__.forEach(function(n) {
    typeof n.__c == "function" && n.__c();
  }), t.__c.__H = null), (t = Ir({}, t)).__c != null && (t.__c.__P === i && (t.__c.__P = e), t.__c.__e = !0, t.__c = null), t.__k = t.__k && t.__k.map(function(n) {
    return _n(n, e, i);
  })), t;
}
function yn(t, e, i) {
  return t && i && (t.__v = null, t.__k = t.__k && t.__k.map(function(n) {
    return yn(n, e, i);
  }), t.__c && t.__c.__P === e && (t.__e && i.appendChild(t.__e), t.__c.__e = !0, t.__c.__P = i)), t;
}
function bt() {
  this.__u = 0, this.o = null, this.__b = null;
}
function vn(t) {
  if (!t.__) return null;
  var e = t.__.__c;
  return e && e.__a && e.__a(t);
}
function et() {
  this.i = null, this.l = null;
}
C.unmount = function(t) {
  var e = t.__c;
  e && (e.__z = !0), e && e.__R && e.__R(), e && 32 & t.__u && (t.type = null), Fi && Fi(t);
}, (bt.prototype = new ue()).__c = function(t, e) {
  var i = e.__c, n = this;
  n.o == null && (n.o = []), n.o.push(i);
  var r = vn(n.__v), o = !1, a = function() {
    o || n.__z || (o = !0, i.__R = null, r ? r(d) : d());
  };
  i.__R = a;
  var l = i.__P;
  i.__P = null;
  var d = function() {
    if (!--n.__u) {
      if (n.state.__a) {
        var c = n.state.__a;
        n.__v.__k[0] = yn(c, c.__c.__P, c.__c.__O);
      }
      var h;
      for (n.setState({ __a: n.__b = null }); h = n.o.pop(); ) h.__P = l, h.forceUpdate();
    }
  };
  n.__u++ || 32 & e.__u || n.setState({ __a: n.__b = n.__v.__k[0] }), t.then(a, a);
}, bt.prototype.componentWillUnmount = function() {
  this.o = [];
}, bt.prototype.render = function(t, e) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), n = this.__v.__k[0].__c;
      this.__v.__k[0] = _n(this.__b, i, n.__O = n.__P);
    }
    this.__b = null;
  }
  var r = e.__a && It(X, null, t.fallback);
  return r && (r.__u &= -33), [It(X, null, e.__a ? null : t.children), r];
};
var Ni = function(t, e, i) {
  if (++i[1] === i[0] && t.l.delete(e), t.props.revealOrder && (t.props.revealOrder[0] !== "t" || !t.l.size)) for (i = t.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    t.i = i = i[2];
  }
};
(et.prototype = new ue()).__a = function(t) {
  var e = this, i = vn(e.__v), n = e.l.get(t);
  return n[0]++, function(r) {
    var o = function() {
      e.props.revealOrder ? (n.push(r), Ni(e, t, n)) : r();
    };
    i ? i(o) : o();
  };
}, et.prototype.render = function(t) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var e = ct(t.children);
  t.revealOrder && t.revealOrder[0] === "b" && e.reverse();
  for (var i = e.length; i--; ) this.l.set(e[i], this.i = [1, 0, this.i]);
  return t.children;
}, et.prototype.componentDidUpdate = et.prototype.componentDidMount = function() {
  var t = this;
  this.l.forEach(function(e, i) {
    Ni(t, i, e);
  });
};
var Or = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, Rr = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, Pr = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, Ar = /[A-Z0-9]/g, Dr = typeof document < "u", Lr = function(t) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(t);
};
ue.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t) {
  Object.defineProperty(ue.prototype, t, { configurable: !0, get: function() {
    return this["UNSAFE_" + t];
  }, set: function(e) {
    Object.defineProperty(this, t, { configurable: !0, writable: !0, value: e });
  } });
});
var Ui = C.event;
function Mr() {
}
function Fr() {
  return this.cancelBubble;
}
function Nr() {
  return this.defaultPrevented;
}
C.event = function(t) {
  return Ui && (t = Ui(t)), t.persist = Mr, t.isPropagationStopped = Fr, t.isDefaultPrevented = Nr, t.nativeEvent = t;
};
var Ur = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, zi = C.vnode;
C.vnode = function(t) {
  typeof t.type == "string" && (function(e) {
    var i = e.props, n = e.type, r = {}, o = n.indexOf("-") === -1;
    for (var a in i) {
      var l = i[a];
      if (!(a === "value" && "defaultValue" in i && l == null || Dr && a === "children" && n === "noscript" || a === "class" || a === "className")) {
        var d = a.toLowerCase();
        a === "defaultValue" && "value" in i && i.value == null ? a = "value" : a === "download" && l === !0 ? l = "" : d === "translate" && l === "no" ? l = !1 : d[0] === "o" && d[1] === "n" ? d === "ondoubleclick" ? a = "ondblclick" : d !== "onchange" || n !== "input" && n !== "textarea" || Lr(i.type) ? d === "onfocus" ? a = "onfocusin" : d === "onblur" ? a = "onfocusout" : Pr.test(a) && (a = d) : d = a = "oninput" : o && Rr.test(a) ? a = a.replace(Ar, "-$&").toLowerCase() : l === null && (l = void 0), d === "oninput" && r[a = d] && (a = "oninputCapture"), r[a] = l;
      }
    }
    n == "select" && r.multiple && Array.isArray(r.value) && (r.value = ct(i.children).forEach(function(c) {
      c.props.selected = r.value.indexOf(c.props.value) != -1;
    })), n == "select" && r.defaultValue != null && (r.value = ct(i.children).forEach(function(c) {
      c.props.selected = r.multiple ? r.defaultValue.indexOf(c.props.value) != -1 : r.defaultValue == c.props.value;
    })), i.class && !i.className ? (r.class = i.class, Object.defineProperty(r, "className", Ur)) : (i.className && !i.class || i.class && i.className) && (r.class = r.className = i.className), e.props = r;
  })(t), t.$$typeof = Or, zi && zi(t);
};
var Bi = C.__r;
C.__r = function(t) {
  Bi && Bi(t), t.__c;
};
var Hi = C.diffed;
C.diffed = function(t) {
  Hi && Hi(t);
  var e = t.props, i = t.__e;
  i != null && t.type === "textarea" && "value" in e && e.value !== i.value && (i.value = e.value == null ? "" : e.value);
};
var bn = jt(
  void 0
), Ye = (t) => {
  const e = Yt(bn);
  if (!e)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return e;
}, zr = ({
  client: t,
  children: e
}) => (V(() => (t.mount(), () => {
  t.unmount();
}), [t]), /* @__PURE__ */ s(bn.Provider, { value: t, children: e })), wn = jt(!1), Br = () => Yt(wn);
wn.Provider;
function Hr() {
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
var Gr = jt(Hr()), $r = () => Yt(Gr), Wr = (t, e, i) => {
  const n = i?.state.error && typeof t.throwOnError == "function" ? ei(t.throwOnError, [i.state.error, i]) : t.throwOnError;
  (t.suspense || t.experimental_prefetchInRender || n) && (e.isReset() || (t.retryOnMount = !1));
}, Kr = (t) => {
  V(() => {
    t.clearReset();
  }, [t]);
}, Qr = ({
  result: t,
  errorResetBoundary: e,
  throwOnError: i,
  query: n,
  suspense: r
}) => t.isError && !e.isReset() && !t.isFetching && n && (r && t.data === void 0 || ei(i, [t.error, n])), Vr = (t) => {
  if (t.suspense) {
    const i = (r) => r === "static" ? r : Math.max(r ?? 1e3, 1e3), n = t.staleTime;
    t.staleTime = typeof n == "function" ? (...r) => i(n(...r)) : i(n), typeof t.gcTime == "number" && (t.gcTime = Math.max(
      t.gcTime,
      1e3
    ));
  }
}, qr = (t, e) => t.isLoading && t.isFetching && !e, jr = (t, e) => t?.suspense && e.isPending, Gi = (t, e, i) => e.fetchOptimistic(t).catch(() => {
  i.clearReset();
});
function Yr(t, e, i) {
  const n = Br(), r = $r(), o = Ye(), a = o.defaultQueryOptions(t);
  o.getDefaultOptions().queries?._experimental_beforeQuery?.(
    a
  );
  const l = o.getQueryCache().get(a.queryHash);
  a._optimisticResults = n ? "isRestoring" : "optimistic", Vr(a), Wr(a, r, l), Kr(r);
  const d = !o.getQueryCache().get(a.queryHash), [c] = x(
    () => new e(
      o,
      a
    )
  ), h = c.getOptimisticResult(a), u = !n && t.subscribed !== !1;
  if (gn(
    se(
      (p) => {
        const m = u ? c.subscribe(H.batchCalls(p)) : Y;
        return c.updateResult(), m;
      },
      [c, u]
    ),
    () => c.getCurrentResult()
  ), V(() => {
    c.setOptions(a);
  }, [a, c]), jr(a, h))
    throw Gi(a, c, r);
  if (Qr({
    result: h,
    errorResetBoundary: r,
    throwOnError: a.throwOnError,
    query: l,
    suspense: a.suspense
  }))
    throw h.error;
  return o.getDefaultOptions().queries?._experimental_afterQuery?.(
    a,
    h
  ), a.experimental_prefetchInRender && !Oe && qr(h, n) && (d ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    Gi(a, c, r)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    l?.promise
  ))?.catch(Y).finally(() => {
    c.updateResult();
  }), a.notifyOnChangeProps ? h : c.trackResult(h);
}
function mt(t, e) {
  return Yr(t, yr);
}
function Pe(t, e) {
  const i = Ye(), [n] = x(
    () => new xr(
      i,
      t
    )
  );
  V(() => {
    n.setOptions(t);
  }, [n, t]);
  const r = gn(
    se(
      (a) => n.subscribe(H.batchCalls(a)),
      [n]
    ),
    () => n.getCurrentResult()
  ), o = se(
    (a, l) => {
      n.mutate(a, l).catch(Y);
    },
    [n]
  );
  if (r.error && ei(n.options.throwOnError, [r.error]))
    throw r.error;
  return { ...r, mutate: o, mutateAsync: r.mutate };
}
const le = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif", f = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "100%",
    minHeight: "100%",
    fontFamily: le
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
    fontFamily: le
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
    fontFamily: le
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
    fontFamily: le
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: le
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
    fontFamily: le,
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
    fontFamily: le
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
    fontFamily: le
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
}, Xr = `
* { font-family: ${le}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function O({
  variant: t,
  children: e,
  onClick: i,
  type: n = "button",
  title: r,
  active: o = !1,
  style: a,
  class: l,
  disabled: d,
  "aria-label": c
}) {
  const h = t === "primary" ? f.primaryBtn : t === "secondary" ? f.secondaryBtn : t === "icon" ? f.iconBtn : t === "iconSm" ? f.iconBtnSm : t === "placement" ? f.placementBtn(o) : {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.25rem",
    fontFamily: le
  }, u = a ? { ...h, ...a } : h;
  return /* @__PURE__ */ s(
    "button",
    {
      type: n,
      style: u,
      class: l,
      onClick: i,
      title: r,
      disabled: d,
      "aria-label": c,
      children: e
    }
  );
}
const Jr = "https://devgw.revgain.ai/rg-pex", Sn = "designerIud";
function Zr() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(Sn);
  } catch {
    return null;
  }
}
function tt(t) {
  const e = {
    "Content-Type": "application/json",
    schema: "customer_1001",
    ...t
  }, i = Zr();
  return i && (e.iud = i), e;
}
const ee = {
  baseUrl: Jr,
  async get(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, n = await fetch(i, {
      ...e,
      headers: { ...tt(), ...e?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  },
  async post(t, e, i) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "POST",
      ...i,
      headers: { ...tt(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async put(t, e, i) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "PUT",
      ...i,
      headers: { ...tt(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async delete(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, n = await fetch(i, {
      method: "DELETE",
      ...e,
      headers: { ...tt(), ...e?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  }
}, En = (t) => ["guides", "byId", t];
async function es(t) {
  const e = new URLSearchParams({ guide_id: t });
  return ee.get(`/guides?${e.toString()}`);
}
function ts(t) {
  return mt({
    queryKey: En(t),
    queryFn: () => es(t),
    enabled: !!t,
    retry: 0
  });
}
const is = ["guides", "update"];
async function ns({
  guideId: t,
  payload: e
}) {
  return ee.put(`/guides/${t}`, e);
}
function rs() {
  const t = Ye();
  return Pe({
    mutationKey: is,
    mutationFn: ns,
    onSuccess: (e, i) => {
      t.invalidateQueries({ queryKey: En(i.guideId) });
    }
  });
}
const Bt = "Template", Ht = "Description", Gt = "Next";
function ss(t) {
  try {
    const e = JSON.parse(t || "{}");
    return {
      title: e.title ?? Bt,
      description: e.description ?? Ht,
      buttonContent: e.buttonContent ?? Gt
    };
  } catch {
    return {
      title: Bt,
      description: Ht,
      buttonContent: Gt
    };
  }
}
function os(t) {
  return t?.template_key ?? "";
}
const xn = {
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  paddingTop: 24,
  paddingRight: 16,
  paddingBottom: 24,
  paddingLeft: 16,
  fontFamily: f.root.fontFamily
};
function Cn({
  title: t = Bt,
  description: e = Ht,
  buttonContent: i = Gt
}) {
  return /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: 4, position: "relative" }, children: [
    /* @__PURE__ */ s("h3", { style: { fontSize: 14, fontWeight: 600, color: "#1855BC", lineHeight: 1.3, margin: 0 }, children: t }),
    /* @__PURE__ */ s("p", { style: { fontSize: 11, color: "#6b7280", lineHeight: 1.4, margin: 0 }, children: e }),
    /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "center", paddingTop: 4 }, children: /* @__PURE__ */ s(
      "span",
      {
        style: {
          display: "inline-block",
          background: "#007AFF",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: 9999,
          fontWeight: 600,
          fontSize: 10
        },
        children: i
      }
    ) })
  ] });
}
function as(t) {
  return /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", margin: "0 auto" }, children: /* @__PURE__ */ s("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 8, ...xn }, children: [
    /* @__PURE__ */ s(
      "div",
      {
        style: {
          position: "absolute",
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280"
        },
        children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: 14 } })
      }
    ),
    /* @__PURE__ */ s(Cn, { ...t })
  ] }) });
}
function ls(t) {
  return /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", margin: "0 auto", paddingTop: 12 }, children: [
    /* @__PURE__ */ s(
      "div",
      {
        style: {
          position: "absolute",
          left: 16,
          top: -15,
          display: "flex",
          justifyContent: "center"
        },
        children: /* @__PURE__ */ s("iconify-icon", { icon: "iconamoon:arrow-up-2-light", style: { fontSize: 44, color: "#1855BC" } })
      }
    ),
    /* @__PURE__ */ s("div", { style: { position: "relative", marginTop: 0, display: "flex", flexDirection: "column", gap: 8, ...xn }, children: [
      /* @__PURE__ */ s(
        "div",
        {
          style: {
            position: "absolute",
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280"
          },
          children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: 14 } })
        }
      ),
      /* @__PURE__ */ s(Cn, { ...t })
    ] })
  ] });
}
function cs({
  item: t,
  selected: e = !1,
  onClick: i,
  disabled: n = !1
}) {
  const r = t.template, o = ut(() => os(r), [r]), a = ut(() => ss(r.content), [r.content]);
  return /* @__PURE__ */ s(
    "button",
    {
      type: "button",
      onClick: i,
      disabled: n,
      style: {
        width: "100%",
        padding: "12px",
        margin: 0,
        border: e ? "2px solid #3b82f6" : "1px solid #e2e8f0",
        borderRadius: 12,
        background: e ? "rgba(59, 130, 246, 0.06)" : "#fff",
        cursor: n ? "not-allowed" : "pointer",
        opacity: n ? 0.7 : 1,
        textAlign: "left",
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ s(
          o === "tooltip-scratch" ? ls : as,
          {
            title: a.title,
            description: a.description,
            buttonContent: a.buttonContent
          }
        ),
        r.title && /* @__PURE__ */ s(
          "div",
          {
            style: {
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "#475569",
              borderTop: "1px solid #f1f5f9"
            },
            children: r.title
          }
        )
      ]
    }
  );
}
function ds({
  onMessage: t,
  elementSelected: e,
  guideId: i = null,
  templateId: n = null
}) {
  const [r, o] = x(""), [a, l] = x(void 0), [d, c] = x(null), [h, u] = x(""), [p, m] = x("right"), [y, v] = x(""), [E, w] = x(n ?? null), [b, F] = x(!1), [U, G] = x("on_click"), [D, N] = x(null), [T, P] = x(!1), { data: K, isLoading: L } = ts(i), S = K?.data, $ = S?.templates ?? [], J = rs(), q = E ? $.find((R) => R.template_id === E) : null;
  V(() => {
    S && n && $.some((R) => R.template_id === n) && w(n);
  }, [S, n, $]), V(() => {
    t({ type: "EDITOR_READY" });
  }, []), V(() => {
    e ? b ? N({
      selector: e.selector,
      xpath: e.xpath,
      elementInfo: e.elementInfo
    }) : (o(e.selector), l(e.xpath), c(e.elementInfo), u(""), v("")) : b && N(null);
  }, [e, b]);
  const ve = () => {
    P(!1), o(""), l(void 0), c(null), u(""), v(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, fe = async () => {
    if (!S || !i) return;
    const R = Le(), Q = a ?? (r && (r.startsWith("/") || r.startsWith("//")) ? r : null), we = (S.steps ?? S.templates ?? []).slice().sort((A, ne) => A.step_order - ne.step_order).map((A) => ({
      template_id: A.template_id,
      step_order: A.step_order,
      url: A.template_id === E ? R : A.url ?? R,
      x_path: A.template_id === E ? Q : A.x_path
    })), ae = {
      guide_name: S.guide_name ?? "",
      description: S.description ?? "",
      target_segment: S.target_segment ?? null,
      guide_category: S.guide_category ?? null,
      target_page: S.target_page ?? R,
      type: S.type ?? "modal",
      status: S.status ?? "draft",
      priority: S.priority ?? 0,
      templates: we
    };
    v("");
    try {
      await J.mutateAsync({ guideId: i, payload: ae }), ve();
    } catch (A) {
      const ne = A instanceof Error ? A.message : "Failed to update guide";
      v(ne);
    }
  }, be = async () => {
    if (!S || !i) return;
    const R = Le(), Q = D?.xpath ?? (D?.selector?.startsWith("/") || D?.selector?.startsWith("//") ? D?.selector : null) ?? null, we = (S.steps ?? S.templates ?? []).slice().sort((A, ne) => A.step_order - ne.step_order).map((A) => ({
      template_id: A.template_id,
      step_order: A.step_order,
      url: A.url ?? R,
      x_path: A.x_path
    })), ae = {
      guide_name: S.guide_name ?? "",
      description: S.description ?? "",
      target_segment: Q,
      guide_category: S.guide_category ?? null,
      target_page: R,
      type: S.type ?? "modal",
      status: S.status ?? "draft",
      priority: S.priority ?? 0,
      templates: we
    };
    v("");
    try {
      await J.mutateAsync({ guideId: i, payload: ae }), ve();
    } catch (A) {
      const ne = A instanceof Error ? A.message : "Failed to update guide";
      v(ne);
    }
  }, oe = (R) => {
    const Q = [];
    return R.tagName && Q.push(`Tag: ${R.tagName}`), R.id && Q.push(`ID: ${R.id}`), R.className && Q.push(`Class: ${R.className}`), R.textContent && Q.push(`Text: ${R.textContent}`), Q.join(" | ");
  }, te = !!i && !!S;
  return /* @__PURE__ */ s("div", { style: f.root, children: [
    /* @__PURE__ */ s("div", { style: f.header, children: [
      /* @__PURE__ */ s("h2", { style: f.headerTitle, children: te ? S?.guide_name ?? "Guide" : "Create Guide" }),
      /* @__PURE__ */ s(O, { variant: "icon", onClick: () => t({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    b ? /* @__PURE__ */ s("div", { style: { ...f.section, paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ s(
        O,
        {
          variant: "secondary",
          style: { alignSelf: "flex-start" },
          onClick: () => {
            P(!1), F(!1), N(null), t({ type: "CLEAR_SELECTION_CLICKED" });
          },
          children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left", style: { marginRight: "0.5rem" } }),
            "Back"
          ]
        }
      ),
      S?.target_segment && /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Current target segment" }),
        /* @__PURE__ */ s("div", { style: { ...f.selectorBox, marginTop: "0.5rem" }, title: S.target_segment, children: S.target_segment.length > 60 ? S.target_segment.slice(0, 60) + "…" : S.target_segment })
      ] }),
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Action" }),
        /* @__PURE__ */ s(
          "select",
          {
            value: U,
            onChange: (R) => G(R.target.value),
            style: {
              width: "100%",
              marginTop: "0.5rem",
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
              /* @__PURE__ */ s("option", { value: "automatic", children: "Automatic" }),
              /* @__PURE__ */ s("option", { value: "on_click", children: "On click" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Trigger Element" }),
        D ? /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s("div", { style: { ...f.selectorBox, marginTop: "0.5rem" }, title: D.xpath ?? D.selector, children: (D.xpath ?? D.selector) || "-" }),
          D.elementInfo && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: [
            /* @__PURE__ */ s("strong", { style: f.elementInfoTitle, children: "Element Info" }),
            /* @__PURE__ */ s("div", { style: f.elementInfoText, children: oe(D.elementInfo) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              O,
              {
                variant: T ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  P(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              O,
              {
                variant: "secondary",
                style: T ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Hide Selector"
              }
            ),
            S?.target_segment && /* @__PURE__ */ s(
              O,
              {
                variant: "secondary",
                style: { flex: 1, borderColor: "#ef4444", color: "#dc2626" },
                onClick: () => {
                  P(!1), N(null), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: [
                  /* @__PURE__ */ s("iconify-icon", { icon: "mdi:undo", style: { marginRight: "0.25rem" } }),
                  "Clear Trigger"
                ]
              }
            )
          ] })
        ] }) : /* @__PURE__ */ s(
          O,
          {
            variant: T ? "primary" : "secondary",
            style: { marginTop: "0.5rem" },
            onClick: () => {
              P(!0), t({ type: "ACTIVATE_SELECTOR" });
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:selection-marker" }),
              "Select element"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ s(
        O,
        {
          variant: "primary",
          style: { flex: 1 },
          onClick: be,
          disabled: J.isPending,
          children: J.isPending ? "Updating…" : "Update Action"
        }
      ) }),
      y && /* @__PURE__ */ s("div", { style: f.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        y
      ] })
    ] }) : /* @__PURE__ */ s(X, { children: i && L ? /* @__PURE__ */ s("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "2rem", color: "#3b82f6" } }),
      /* @__PURE__ */ s("p", { style: f.emptyStateText, children: "Loading guide…" })
    ] }) : i && !S ? /* @__PURE__ */ s("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle", style: { fontSize: "2rem", color: "#94a3b8" } }),
      /* @__PURE__ */ s("p", { style: f.emptyStateText, children: "Guide not found." })
    ] }) : te && $.length > 0 ? /* @__PURE__ */ s(X, { children: [
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Templates" }),
        /* @__PURE__ */ s(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "1rem"
            },
            children: $.sort((R, Q) => R.step_order - Q.step_order).map((R) => /* @__PURE__ */ s(
              cs,
              {
                item: R,
                selected: E === R.template_id,
                onClick: () => w(R.template_id)
              },
              `${R.template_id}-${R.step_order}`
            ))
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Element for selected template" }),
        r ? /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s("div", { style: f.selectorBox, title: a ?? r, children: (a ?? r).length > 60 ? (a ?? r).slice(0, 60) + "…" : a ?? r }),
          d && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: [
            /* @__PURE__ */ s("strong", { style: f.elementInfoTitle, children: "Element Info" }),
            /* @__PURE__ */ s("div", { style: f.elementInfoText, children: oe(d) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              O,
              {
                variant: T ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  P(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              O,
              {
                variant: "secondary",
                style: T ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Hide Selector"
              }
            ),
            q?.x_path && /* @__PURE__ */ s(
              O,
              {
                variant: "secondary",
                style: { flex: 1, borderColor: "#ef4444", color: "#dc2626" },
                onClick: ve,
                children: [
                  /* @__PURE__ */ s("iconify-icon", { icon: "mdi:undo", style: { marginRight: "0.25rem" } }),
                  "Clear Selection"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "1rem", borderTop: "none", paddingTop: 0 }, children: /* @__PURE__ */ s(
            O,
            {
              variant: "primary",
              style: { flex: 1 },
              onClick: fe,
              disabled: J.isPending,
              children: J.isPending ? "Updating…" : "Update"
            }
          ) })
        ] }) : q?.x_path ? /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s("div", { style: f.selectorBox, title: q.x_path, children: q.x_path.length > 60 ? q.x_path.slice(0, 60) + "…" : q.x_path }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              O,
              {
                variant: T ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  P(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              O,
              {
                variant: "secondary",
                style: T ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Hide Selector"
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "1rem", borderTop: "none", paddingTop: 0 }, children: /* @__PURE__ */ s(
            O,
            {
              variant: "primary",
              style: { flex: 1 },
              onClick: fe,
              disabled: J.isPending,
              children: J.isPending ? "Updating…" : "Update"
            }
          ) })
        ] }) : /* @__PURE__ */ s(
          O,
          {
            variant: T ? "primary" : "secondary",
            onClick: () => {
              P(!0), t({ type: "ACTIVATE_SELECTOR" });
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:selection-marker" }),
              "Select element"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ s(O, { variant: "primary", onClick: () => F(!0), children: "Next" }) }),
      te && y && /* @__PURE__ */ s("div", { style: f.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        y
      ] })
    ] }) : null })
  ] });
}
function Ge({
  type: t = "text",
  value: e,
  onInput: i,
  placeholder: n,
  id: r,
  style: o,
  disabled: a,
  "aria-label": l
}) {
  const d = o ? { ...f.input, ...o } : f.input;
  return /* @__PURE__ */ s(
    "input",
    {
      type: t,
      value: e,
      onInput: i,
      placeholder: n,
      id: r,
      style: d,
      disabled: a,
      "aria-label": l
    }
  );
}
function Tn({
  value: t,
  onInput: e,
  placeholder: i,
  id: n,
  minHeight: r,
  style: o,
  disabled: a,
  "aria-label": l
}) {
  const d = o ? { ...f.textarea, ...o, ...r != null && { minHeight: typeof r == "number" ? `${r}px` : r } } : r != null ? { ...f.textarea, minHeight: typeof r == "number" ? `${r}px` : r } : f.textarea;
  return /* @__PURE__ */ s(
    "textarea",
    {
      value: t,
      onInput: e,
      placeholder: i,
      id: n,
      style: d,
      disabled: a,
      "aria-label": l
    }
  );
}
const us = ["pages", "create"];
async function hs(t) {
  return ee.post("/pages", {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: "active"
  });
}
function fs() {
  return Pe({
    mutationKey: us,
    mutationFn: hs
  });
}
const ps = ["pages", "update"];
async function ms({ pageId: t, payload: e }) {
  return ee.put(`/pages/${t}`, {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: e.status ?? "active"
  });
}
function gs() {
  return Pe({
    mutationKey: ps,
    mutationFn: ms
  });
}
const _s = ["pages", "delete"];
async function ys(t) {
  return ee.delete(`/pages/${t}`);
}
function vs() {
  return Pe({
    mutationKey: _s,
    mutationFn: ys
  });
}
const bs = (t) => ["pages", "check-slug", t];
async function ws(t) {
  return ee.get(`/pages/check-slug?slug=${encodeURIComponent(t)}`);
}
function Ss(t) {
  return mt({
    queryKey: bs(t),
    queryFn: () => ws(t),
    enabled: !!t,
    retry: 0
  });
}
const Es = ["pages", "list"];
async function xs() {
  return ee.get("/pages");
}
function Cs() {
  return mt({
    queryKey: Es,
    queryFn: xs,
    retry: 0
  });
}
const Ts = "designerTaggedPages", it = ["pages", "check-slug"], wt = ["pages", "list"];
function nt() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (e.host || e.hostname || "") + (e.pathname || "/") + (e.search || "") + (e.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function rt() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (e.pathname || "/").replace(/^\//, ""), n = e.search || "", r = e.hash || "";
    return "//*/" + i + n + r;
  } catch {
    return "//*/";
  }
}
function Is({ onMessage: t }) {
  const [e, i] = x("overviewUntagged"), [n, r] = x(""), [o, a] = x(""), [l, d] = x(""), [c, h] = x(!1), [u, p] = x("create"), [m, y] = x(""), [v, E] = x(""), [w, b] = x("suggested"), [F, U] = x(""), [G, D] = x(!1), [N, T] = x(null), [P, K] = x(!1), L = Ye(), S = fs(), $ = gs(), J = vs(), { data: q, isLoading: ve, isError: fe } = Ss(n), { data: be, isLoading: oe } = Cs(), te = !!n && ve, R = S.isPending || $.isPending, Q = (n || "").trim().toLowerCase(), ae = (be?.data ?? []).filter((k) => (k.slug || "").trim().toLowerCase() === Q).filter(
    (k) => (k.name || "").toLowerCase().includes(l.toLowerCase().trim())
  ), A = se(() => {
    i("overviewUntagged"), a(nt() || "(current page)"), h(!1), L.invalidateQueries({ queryKey: it });
  }, [L]), ne = se(() => {
    i("taggedPagesDetailView"), d("");
  }, []), Ae = se(() => {
    T(null), i("tagPageFormView"), h(!0), U(rt()), y(""), E(""), p("create"), b("suggested"), D(!1);
  }, []), gt = se((k) => {
    T(k.page_id), i("tagPageFormView"), h(!0), U(k.slug || rt()), y(k.name || ""), E(k.description || ""), p("create"), b("suggested"), D(!1);
  }, []);
  V(() => {
    t({ type: "EDITOR_READY" });
  }, []), V(() => {
    r(rt()), a(nt() || "(current page)");
  }, []), V(() => {
    if (!n) {
      i("overviewUntagged");
      return;
    }
    if (fe) {
      (e === "overviewTagged" || e === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    q !== void 0 && (e === "overviewTagged" || e === "overviewUntagged") && i(q.exists ? "overviewTagged" : "overviewUntagged");
  }, [n, q, fe, e]), V(() => {
    let k = nt();
    const pe = () => {
      const ge = nt();
      ge !== k && (k = ge, r(rt()), a(ge || "(current page)"), i("overviewUntagged"));
    }, me = () => pe(), De = () => pe();
    window.addEventListener("hashchange", me), window.addEventListener("popstate", De);
    const Ue = setInterval(pe, 1500);
    return () => {
      window.removeEventListener("hashchange", me), window.removeEventListener("popstate", De), clearInterval(Ue);
    };
  }, []);
  const Xe = async () => {
    const k = m.trim();
    if (!k) {
      D(!0);
      return;
    }
    D(!1);
    const pe = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, me = F.trim() || pe || "/";
    try {
      if (N)
        await $.mutateAsync({
          pageId: N,
          payload: {
            name: k,
            slug: me,
            description: v.trim() || void 0,
            status: "active"
          }
        }), T(null), L.invalidateQueries({ queryKey: it }), L.invalidateQueries({ queryKey: wt }), A();
      else {
        const De = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, Ue = F.trim() || De;
        await S.mutateAsync({
          name: k,
          slug: me,
          description: v.trim() || void 0
        });
        const ge = Ts, _t = localStorage.getItem(ge) || "[]", _ = JSON.parse(_t);
        _.push({ pageName: k, url: Ue }), localStorage.setItem(ge, JSON.stringify(_)), L.invalidateQueries({ queryKey: it }), L.invalidateQueries({ queryKey: wt }), i("overviewTagged"), h(!1);
      }
    } catch {
    }
  }, ce = async (k) => {
    if (window.confirm("Delete this page?"))
      try {
        await J.mutateAsync(k), L.invalidateQueries({ queryKey: it }), L.invalidateQueries({ queryKey: wt });
      } catch {
      }
  }, Se = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return P ? /* @__PURE__ */ s("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(O, { variant: "icon", title: "Expand", onClick: () => K(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: f.panel, children: [
    /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(O, { variant: "icon", title: "Minimize", onClick: () => K(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: f.panelBody, children: [
      te && (e === "overviewTagged" || e === "overviewUntagged") && /* @__PURE__ */ s("div", { style: { ...Se, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Checking page…" })
      ] }),
      !te && e === "overviewTagged" && /* @__PURE__ */ s("div", { style: Se, children: [
        /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "1rem", cursor: "pointer" }, onClick: ne, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ s("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: o })
            ] })
          ] }),
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ s(O, { variant: "primary", style: { width: "100%" }, onClick: Ae, children: "Tag Page" })
      ] }),
      e === "taggedPagesDetailView" && /* @__PURE__ */ s("div", { style: Se, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (k) => {
              k.preventDefault(), A();
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: oe ? "…" : ae.length }),
          /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ s("div", { style: f.searchWrap, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
          /* @__PURE__ */ s(
            Ge,
            {
              type: "text",
              placeholder: "Search Pages",
              value: l,
              onInput: (k) => d(k.target.value),
              style: f.searchInput
            }
          ),
          l && /* @__PURE__ */ s(O, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => d(""), children: "Clear" })
        ] }),
        oe ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ s("span", { children: "Loading pages…" })
        ] }) : ae.map((k) => /* @__PURE__ */ s("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: k.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ s(O, { variant: "iconSm", title: "Edit", onClick: () => gt(k), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ s(O, { variant: "iconSm", title: "Delete", onClick: () => ce(k.page_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, k.page_id)),
        /* @__PURE__ */ s(O, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: Ae, children: "Tag Page" })
      ] }),
      !te && e === "overviewUntagged" && /* @__PURE__ */ s("div", { style: { ...Se, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ s("div", { style: { ...f.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ s(O, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: Ae, children: "Tag Page" })
      ] }),
      e === "tagPageFormView" && /* @__PURE__ */ s("div", { style: { ...Se, gap: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (k) => {
              k.preventDefault(), T(null), A(), h(!1);
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back"
            ]
          }
        ),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: f.sectionLabel, children: N ? "EDIT PAGE" : "PAGE SETUP" }),
          !N && /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "pageSetup", value: "create", checked: u === "create", onChange: () => p("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create New Page" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "pageSetup", value: "merge", checked: u === "merge", onChange: () => p("merge"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Merge with Existing" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }, children: [
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: [
                "Page Name ",
                /* @__PURE__ */ s("span", { style: { color: "#ef4444" }, children: "*" })
              ] }),
              /* @__PURE__ */ s(
                Ge,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: m,
                  onInput: (k) => y(k.target.value)
                }
              ),
              G && /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ s(
                Tn,
                {
                  placeholder: "Click to add description",
                  value: v,
                  onInput: (k) => E(k.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: { ...f.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "INCLUDE PAGE RULES",
            /* @__PURE__ */ s("span", { style: { color: "#94a3b8" }, title: "Define how this page is identified", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }, children: [
            /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#334155" }, children: "Include Rule 1" }),
            /* @__PURE__ */ s(O, { variant: "iconSm", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "suggested", checked: w === "suggested", onChange: () => b("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "exact", checked: w === "exact", onChange: () => b("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "builder", checked: w === "builder", onChange: () => b("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ s(Ge, { type: "text", placeholder: "e.g. //*/path/to/page", value: F, onInput: (k) => U(k.target.value) })
          ] })
        ] })
      ] })
    ] }),
    c && /* @__PURE__ */ s("div", { style: f.footer, children: [
      /* @__PURE__ */ s(
        O,
        {
          variant: "secondary",
          onClick: () => {
            T(null), A();
          },
          disabled: R,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ s(O, { variant: "primary", style: { flex: 1 }, onClick: Xe, disabled: R, children: R ? /* @__PURE__ */ s(X, { children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        N ? "Updating…" : "Saving…"
      ] }) : N ? "Update" : "Save" })
    ] })
  ] });
}
const ks = ["features", "create"];
async function Os(t) {
  return ee.post("/features", t);
}
function Rs() {
  return Pe({
    mutationKey: ks,
    mutationFn: Os
  });
}
const Ps = ["features", "update"];
async function As({
  featureId: t,
  payload: e
}) {
  return ee.put(`/features/${t}`, e);
}
function Ds() {
  return Pe({
    mutationKey: Ps,
    mutationFn: As
  });
}
const Ls = ["features", "delete"];
async function Ms(t) {
  return ee.delete(`/features/${t}`);
}
function Fs() {
  return Pe({
    mutationKey: Ls,
    mutationFn: Ms
  });
}
const He = ["features", "list"];
async function Ns() {
  const t = await ee.get("/features");
  return Array.isArray(t) ? { data: t } : t;
}
function Us() {
  return mt({
    queryKey: He,
    queryFn: Ns,
    retry: 0
  });
}
const $i = "designerHeatmapEnabled";
function zs({ onMessage: t, elementSelected: e }) {
  const [i, n] = x("overview"), [r, o] = x(!1), [a, l] = x(""), [d, c] = x(null), [h, u] = x(""), [p, m] = x(!1), [y, v] = x(!1), [E, w] = x(!1), [b, F] = x(!1), [U, G] = x(!1), [D, N] = x("create"), [T, P] = x("suggested"), [K, L] = x(""), [S, $] = x(""), [J, q] = x(null), [ve, fe] = x(null), [be, oe] = x(""), te = Ye(), R = Rs(), Q = Ds(), we = Fs(), { data: ae, isLoading: A } = Us(), ne = R.isPending || Q.isPending || we.isPending, Ae = ae?.data ?? [], gt = Ae.length, Xe = Ae.filter((_) => (_.name || "").toLowerCase().includes(be.toLowerCase().trim())).sort((_, Z) => (_.name || "").localeCompare(Z.name || "", void 0, { sensitivity: "base" })), ce = se(() => {
    n("overview"), o(!1), l(""), c(null), $(""), u(""), m(!1), q(null), oe(""), te.invalidateQueries({ queryKey: He });
  }, [te]), Se = se(() => {
    n("taggedList"), oe("");
  }, []), k = se((_) => _.rules?.find(
    (_e) => _e.selector_type === "xpath" && (_e.selector_value ?? "").trim() !== ""
  )?.selector_value ?? "", []), pe = se(
    (_) => {
      n("form"), o(!0), _ ? (q(_.feature_id), u(_.name || ""), L(_.description || ""), $(k(_)), P("exact")) : (q(null), u(""), L(""), $(e?.xpath || ""), l(e?.selector || ""), c(e?.elementInfo || null)), m(!1);
    },
    [e, k]
  );
  V(() => {
    t({ type: "EDITOR_READY" });
  }, []), V(() => {
    t({ type: "FEATURES_FOR_HEATMAP", features: ae?.data ?? [] });
  }, [ae, t]), V(() => {
    const _ = localStorage.getItem($i) === "true";
    v(_);
  }, []), V(() => {
    e ? (l(e.selector), c(e.elementInfo), $(e.xpath || ""), o(!0), n("form"), u(""), m(!1), N("create"), L(""), P("exact")) : ce();
  }, [e]);
  const me = () => {
    const _ = !y;
    v(_);
    try {
      localStorage.setItem($i, String(_));
    } catch {
    }
    t({ type: "HEATMAP_TOGGLE", enabled: _ });
  }, De = (_) => _.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""), Ue = async () => {
    const _ = h.trim();
    if (!_) {
      m(!0);
      return;
    }
    m(!1);
    const Z = S || e?.xpath || "";
    if (T === "exact") {
      if (!Z) return;
      const _e = {
        name: _,
        slug: De(_),
        description: K.trim() || "",
        status: "active",
        rules: [
          {
            selector_type: "xpath",
            selector_value: Z,
            match_mode: "exact",
            priority: 10,
            is_active: !0
          }
        ]
      };
      try {
        J ? (await Q.mutateAsync({ featureId: J, payload: _e }), te.invalidateQueries({ queryKey: He }), ce()) : (await R.mutateAsync(_e), te.invalidateQueries({ queryKey: He }), ce());
      } catch {
      }
      return;
    }
  }, ge = async (_) => {
    if (window.confirm("Delete this feature?")) {
      fe(_);
      try {
        await we.mutateAsync(_), te.invalidateQueries({ queryKey: He }), J === _ && (q(null), ce());
      } catch {
      } finally {
        fe(null);
      }
    }
  }, _t = (_) => {
    const Z = [];
    _.tagName && Z.push(`Tag: ${_.tagName}`), _.id && Z.push(`ID: ${_.id}`), _.className && Z.push(`Class: ${_.className}`);
    const _e = (_.textContent || "").slice(0, 80);
    return _e && Z.push(`Text: ${_e}`), Z.join(" | ");
  };
  return E ? /* @__PURE__ */ s("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: r ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(O, { variant: "icon", title: "Expand", onClick: () => w(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: f.panel, children: [
    /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(O, { variant: "icon", title: "Minimize", onClick: () => w(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: r ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ s("a", { href: "#", style: f.link, onClick: (_) => {
          _.preventDefault(), ce();
        }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: D === "create", onChange: () => N("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: D === "merge", onChange: () => N("merge"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Merge with existing" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }, children: [
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: [
                "Feature name ",
                /* @__PURE__ */ s("span", { style: { color: "#ef4444" }, children: "*" })
              ] }),
              /* @__PURE__ */ s(
                Ge,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: h,
                  onInput: (_) => u(_.target.value)
                }
              ),
              p && /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a feature name."
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ s(
                Tn,
                {
                  placeholder: "Describe your Feature",
                  value: K,
                  onInput: (_) => L(_.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: { ...f.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "FEATURE ELEMENT MATCHING",
            /* @__PURE__ */ s("span", { style: { color: "#94a3b8" }, title: "Match the element for this feature", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: T === "suggested", onChange: () => P("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: T === "ruleBuilder", onChange: () => P("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: T === "customCss", onChange: () => P("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: T === "exact", onChange: () => P("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: T === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ s("div", { style: f.selectorBox, children: T === "exact" ? (e?.xpath ?? S) || "-" : (e?.selector ?? a) || "-" })
          ] }),
          d && /* @__PURE__ */ s("div", { style: { marginTop: "1rem" }, children: [
            /* @__PURE__ */ s(
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
                onClick: () => G((_) => !_),
                "aria-expanded": U,
                children: [
                  /* @__PURE__ */ s("label", { style: { ...f.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                  /* @__PURE__ */ s(
                    "iconify-icon",
                    {
                      icon: U ? "mdi:chevron-up" : "mdi:chevron-down",
                      style: { fontSize: "1.125rem", color: "#64748b", flexShrink: 0 }
                    }
                  )
                ]
              }
            ),
            U && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.elementInfoText, children: _t(d) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ s("div", { style: f.footer, children: [
        /* @__PURE__ */ s(O, { variant: "secondary", onClick: ce, children: "Cancel" }),
        /* @__PURE__ */ s(O, { variant: "primary", style: { flex: 1 }, onClick: Ue, disabled: ne, children: ne ? "Saving..." : "Save" })
      ] })
    ] }) : /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i === "taggedList" ? /* @__PURE__ */ s(X, { children: [
      /* @__PURE__ */ s(
        "a",
        {
          href: "#",
          style: f.link,
          onClick: (_) => {
            _.preventDefault(), ce();
          },
          children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
            " Back to overview"
          ]
        }
      ),
      /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: A ? "…" : Xe.length }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Tagged Features" })
      ] }),
      /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged features" }),
      /* @__PURE__ */ s("div", { style: f.searchWrap, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
        /* @__PURE__ */ s(
          Ge,
          {
            type: "text",
            placeholder: "Search features",
            value: be,
            onInput: (_) => oe(_.target.value),
            style: f.searchInput
          }
        ),
        be && /* @__PURE__ */ s(O, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => oe(""), children: "Clear" })
      ] }),
      A ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Loading features…" })
      ] }) : Xe.map((_) => {
        const Z = ve === _.feature_id;
        return /* @__PURE__ */ s("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: _.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem", alignItems: "center" }, children: [
            /* @__PURE__ */ s(O, { variant: "iconSm", title: "Edit", onClick: () => pe(_), disabled: Z, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            Z ? /* @__PURE__ */ s("span", { style: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", color: "#64748b" } }) }) : /* @__PURE__ */ s(O, { variant: "iconSm", title: "Delete", onClick: () => ge(_.feature_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, _.feature_id);
      }),
      /* @__PURE__ */ s(O, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: () => pe(), children: "Tag Feature" })
    ] }) : A ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.75rem" } }),
      /* @__PURE__ */ s("span", { children: "Loading features…" })
    ] }) : /* @__PURE__ */ s(X, { children: [
      /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "FEATURES OVERVIEW" }),
      /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "0.75rem" }, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#14b8a6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: "0" }),
          /* @__PURE__ */ s("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Suggested Features" }),
            /* @__PURE__ */ s("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of untagged elements on this page" })
          ] })
        ] }),
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "0.75rem", cursor: "pointer" }, onClick: Se, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: gt }),
          /* @__PURE__ */ s("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Tagged Features" }),
            /* @__PURE__ */ s("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of tagged Features on this page" })
          ] })
        ] }),
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ s("div", { style: f.heatmapRow, children: [
        /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Heatmap" }),
        /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ s(
            "button",
            {
              role: "switch",
              tabIndex: 0,
              style: f.toggle(y),
              onClick: me,
              onKeyDown: (_) => _.key === "Enter" && me(),
              children: /* @__PURE__ */ s("span", { style: f.toggleThumb(y) })
            }
          ),
          /* @__PURE__ */ s(O, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          O,
          {
            variant: b ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              F(!0), t({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Re-Select"
          }
        ),
        /* @__PURE__ */ s(
          O,
          {
            variant: "secondary",
            style: b ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              F(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Hide Selector"
          }
        )
      ] })
    ] }) }) })
  ] });
}
const Bs = new Tr({
  defaultOptions: { mutations: { retry: 0 } }
});
class Hs {
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
  create(e, i, n) {
    if (console.log("[Visual Designer] EditorFrame.create() called with mode:", i), this.iframe) {
      console.warn("[Visual Designer] EditorFrame already created, skipping");
      return;
    }
    this.mode = i || null, this.guideId = n?.guideId ?? null, this.templateId = n?.templateId ?? null, this.messageCallback = e, console.log("[Visual Designer] Creating editor iframe with mode:", this.mode), this.iframe = document.createElement("iframe"), this.iframe.id = "designer-editor-frame", this.iframe.style.cssText = `
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
      z-index: 999999;
      display: none;
      overflow: hidden;
    `, this.createDragHandle(), this.loadEditorHtml(), window.addEventListener("message", this.handleMessage);
    const r = () => {
      document.body ? (document.body.appendChild(this.iframe), this.dragHandle && document.body.appendChild(this.dragHandle), this.iframe && (this.iframe.onload = () => {
        this.isReady = !0, this.renderEditorContent(), this.updateDragHandlePosition();
      })) : document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", r) : setTimeout(r, 100);
    };
    r();
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
    const e = this.getMinimalEditorHtml(), i = new Blob([e], { type: "text/html" }), n = URL.createObjectURL(i);
    this.iframe && (this.iframe.src = n);
  }
  /**
   * Render Preact editor component into iframe
   */
  renderEditorContent() {
    if (!this.iframe || !this.isReady) return;
    const e = this.iframe.contentDocument, i = e?.getElementById("designer-editor-root");
    if (!e || !i) return;
    const n = (o) => this.messageCallback?.(o), r = this.mode === "tag-page" ? /* @__PURE__ */ s(Is, { onMessage: n }) : this.mode === "tag-feature" ? /* @__PURE__ */ s(
      zs,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    ) : /* @__PURE__ */ s(
      ds,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState,
        guideId: this.guideId,
        templateId: this.templateId
      }
    );
    Ie(
      /* @__PURE__ */ s(zr, { client: Bs, children: r }),
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
  <style>${Xr}</style>
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
      z-index: 1000000;
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
      const c = Math.abs(e.clientX - this.mouseDownX), h = Math.abs(e.clientY - this.mouseDownY);
      if (Math.sqrt(c * c + h * h) > this.dragThreshold)
        this.isDragging = !0, document.body.style.cursor = "grabbing", document.documentElement.style.cursor = "grabbing", document.body.style.userSelect = "none", document.documentElement.style.userSelect = "none", this.iframe && (this.iframe.style.pointerEvents = "none"), this.gripButton && (this.gripButton.style.cursor = "grabbing");
      else
        return;
    }
    e.preventDefault(), e.stopPropagation();
    const i = e.clientX - this.dragStartX, n = e.clientY - this.dragStartY, r = window.innerWidth, o = window.innerHeight, a = this.iframe.offsetWidth, l = Math.max(-a + 50, Math.min(i, r - 50)), d = Math.max(0, Math.min(n, o - 100));
    this.iframe.style.left = `${l}px`, this.iframe.style.top = `${d}px`, this.iframe.style.right = "auto", this.iframe.style.bottom = "auto", this.dragHandle.style.left = `${l}px`, this.dragHandle.style.top = `${d}px`;
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
const Gs = "visual-designer-guides", Wi = "1.0.0";
class $s {
  storageKey;
  constructor(e = Gs) {
    this.storageKey = e;
  }
  getGuides() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const i = JSON.parse(e);
      return i.version !== Wi ? (this.clear(), []) : i.guides || [];
    } catch {
      return [];
    }
  }
  getGuidesByPage(e) {
    return this.getGuides().filter((n) => n.page === e && n.status === "active");
  }
  saveGuide(e) {
    const i = this.getGuides(), n = i.findIndex((o) => o.id === e.id), r = {
      ...e,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: e.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    n >= 0 ? i[n] = r : i.push(r), this.saveGuides(i);
  }
  deleteGuide(e) {
    const i = this.getGuides().filter((n) => n.id !== e);
    this.saveGuides(i);
  }
  saveGuides(e) {
    const i = { guides: e, version: Wi };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(e) {
    return this.getGuides().find((i) => i.id === e) || null;
  }
}
function Ws({ onExit: t }) {
  const e = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: I.bg,
    border: `2px solid ${I.primary}`,
    borderRadius: I.borderRadius,
    color: I.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: I.fontFamily,
    cursor: "pointer",
    zIndex: String(I.zIndex.controls),
    boxShadow: I.shadow,
    transition: "all 0.2s ease",
    pointerEvents: "auto"
  };
  return /* @__PURE__ */ s(
    "button",
    {
      id: "designer-exit-editor-btn",
      style: e,
      onClick: t,
      onMouseEnter: (i) => {
        i.currentTarget.style.background = I.primary, i.currentTarget.style.color = I.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = I.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = I.bg, i.currentTarget.style.color = I.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = I.shadow;
      },
      children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function Ks() {
  return /* @__PURE__ */ s(
    "div",
    {
      id: "designer-red-border-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: `5px solid ${I.primary}`,
        pointerEvents: "none",
        zIndex: I.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function Qs() {
  return /* @__PURE__ */ s(
    "div",
    {
      id: "designer-studio-badge",
      style: {
        position: "fixed",
        top: "4px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "0px 10px 3px",
        background: I.primary,
        color: I.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: I.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${I.primary}`,
        borderTop: "none",
        zIndex: I.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function Vs() {
  return /* @__PURE__ */ s(
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
        zIndex: I.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: I.fontFamily
      },
      children: [
        /* @__PURE__ */ s(
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
              /* @__PURE__ */ s(
                "div",
                {
                  style: {
                    width: 56,
                    height: 56,
                    border: "3px solid #e2e8f0",
                    borderTopColor: I.primary,
                    borderRadius: "50%",
                    animation: "vd-spin 0.8s linear infinite",
                    marginBottom: "1.5rem"
                  }
                }
              ),
              /* @__PURE__ */ s(
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
              /* @__PURE__ */ s(
                "div",
                {
                  style: {
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    fontWeight: 500
                  },
                  children: [
                    /* @__PURE__ */ s("span", { style: { animation: "vd-dot1 1.4s ease-in-out infinite" }, children: "." }),
                    /* @__PURE__ */ s("span", { style: { animation: "vd-dot2 1.4s ease-in-out infinite" }, children: "." }),
                    /* @__PURE__ */ s("span", { style: { animation: "vd-dot3 1.4s ease-in-out infinite" }, children: "." })
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ s("style", { children: `
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
function qs(t) {
  return /* @__PURE__ */ s(X, { children: [
    t.showExitButton && /* @__PURE__ */ s(Ws, { onExit: t.onExitEditor }),
    t.showRedBorder && /* @__PURE__ */ s(Ks, {}),
    t.showBadge && /* @__PURE__ */ s(Qs, {}),
    t.showLoading && /* @__PURE__ */ s(Vs, {})
  ] });
}
function js(t, e) {
  Ie(/* @__PURE__ */ s(qs, { ...e }), t);
}
class In {
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
  constructor(e = {}) {
    this.config = e, this.guideId = e.guideId ?? null, this.templateId = e.templateId ?? null, this.storage = new $s(e.storageKey), this.editorMode = new Nn(), this.guideRenderer = new er(), this.featureHeatmapRenderer = new ir(), this.editorFrame = new Hs();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((i, n) => {
      const r = { guide_id: i, step_index: n }, o = this.fetchedGuides.find((a) => a.guide_id === i);
      if (o) {
        const d = [...(o.templates || []).filter((c) => c.is_active)].sort((c, h) => c.step_order - h.step_order)[n];
        d && (r.template_id = d.template_id, r.template_key = d.template.template_key, r.step_order = d.step_order, r.xpath = d.x_path);
      }
      this.trackEvent("dismissed", r), this.config.onGuideDismissed?.(i);
    }), this.guideRenderer.setOnNext((i, n, r) => {
      const o = this.fetchedGuides.find((a) => a.guide_id === i);
      if (o) {
        const d = [...(o.templates || []).filter((c) => c.is_active)].sort((c, h) => c.step_order - h.step_order)[n];
        if (d) {
          let c = "middle";
          n === 0 ? c = "first" : n === r - 1 && (c = "last"), this.trackEvent("viewed", {
            guide_id: i,
            template_id: d.template_id,
            map_id: d.map_id,
            step_order: d.step_order,
            template_key: d.template.template_key,
            guide_step: c,
            xpath: d.x_path
          });
        }
      }
    }), this.shouldEnableEditorMode() ? (this.showLoading = !0, this.renderOverlays(), this.enableEditor()) : this.loadGuides(), this.heatmapEnabled = localStorage.getItem("designerHeatmapEnabled") === "true", this.renderFeatureHeatmap(), this.setupEventListeners(), this.fetchGuides();
  }
  enableEditor() {
    if (this.isEditorMode) return;
    this.isEditorMode = !0;
    let e = typeof window < "u" && window.__visualDesignerMode || null;
    e || (e = localStorage.getItem("designerModeType") || null), this.editorFrame.create((n) => this.handleEditorMessage(n), e, {
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
    return this.storage.getGuidesByPage(Le());
  }
  saveGuide(e) {
    const i = {
      ...e,
      id: ai(),
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
      const e = Le(), i = await ee.get(`/guides?target_page=${encodeURIComponent(e)}`);
      i && i.data && (this.fetchedGuides = Array.isArray(i.data) ? i.data : [i.data], console.log("[Visual Designer] Fetched guides for page:", e, this.fetchedGuides));
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
    let i = "Unknown", n = "Unknown";
    e.indexOf("Chrome") > -1 && e.indexOf("Edg") === -1 ? (i = "Chrome", n = e.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown") : e.indexOf("Safari") > -1 && e.indexOf("Chrome") === -1 ? (i = "Safari", n = e.match(/Version\/([\d.]+)/)?.[1] || "Unknown") : e.indexOf("Firefox") > -1 ? (i = "Firefox", n = e.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown") : e.indexOf("Edg") > -1 && (i = "Edge", n = e.match(/Edg\/([\d.]+)/)?.[1] || "Unknown");
    let r = "Unknown", o = "Unknown";
    return e.indexOf("Win") > -1 ? (r = "Windows", e.indexOf("Windows NT 10.0") > -1 && (o = "10")) : e.indexOf("Mac") > -1 ? (r = "macOS", o = e.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : e.indexOf("Linux") > -1 ? r = "Linux" : e.indexOf("Android") > -1 ? (r = "Android", o = e.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (e.indexOf("iOS") > -1 || e.indexOf("iPhone") > -1 || e.indexOf("iPad") > -1) && (r = "iOS", o = e.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), {
      device_type: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(e) ? "mobile" : "desktop",
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      browser_name: i,
      browser_version: n,
      os_name: r,
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
      const i = (/* @__PURE__ */ new Date()).toISOString(), n = this._getIdentity(), r = this._getPageContext();
      let o = 0;
      const a = this._getStorageItem("__rg_session_start");
      if (a) {
        const h = new Date(a).getTime();
        isNaN(h) || (o = Date.now() - h);
      }
      const d = (this._getStorageItem("__rg_visitor_traits") || {}).email || null, c = e.map((h) => {
        const u = h.properties || {};
        return {
          event_id: "evt_" + ai(),
          event_type: "guide",
          event_name: h.eventName,
          timestamp: i,
          ingested_at: i,
          // Simulating server-side ingestion time
          visitor_id: n.visitor_id,
          account_id: n.account_id,
          session_id: n.session_id,
          page_url: r.page_url,
          visitor_email: d,
          session_duration_ms: o,
          element_id: u.element_id || u.xpath || null,
          guide_id: u.guide_id || null,
          properties: u
        };
      });
      console.log("[Visual Designer] Tracking Batch:", c), await ee.post("/guide-events", {
        events: c
      });
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
    console.log("[Visual Designer] Click Event:", e);
    const i = e.target;
    if (!i) return;
    const n = Me.getXPath(i);
    console.log("[Visual Designer] Clicked Element XPath:", n);
    for (const r of this.fetchedGuides)
      console.log("Guide:", r), r.target_segment && r.target_segment === n && (this.trackEvent("triggered", {
        guide_id: r.guide_id,
        guide_name: r.guide_name,
        xpath: n
      }), this.guideRenderer.renderTriggeredGuide(r));
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
      page: Le()
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
      let r = (i.rules?.find(
        (o) => o.selector_type === "xpath" && (o.selector_value ?? "").trim() !== ""
      )?.selector_value ?? "").trim();
      return r && r.startsWith("/body") && (r = "/html[1]" + r), {
        id: i.feature_id,
        featureName: i.name,
        selector: r,
        url: ""
      };
    }), this.renderFeatureHeatmap();
  }
  getTaggedFeatures() {
    return this.featuresForHeatmap;
  }
  renderFeatureHeatmap() {
    this.featureHeatmapRenderer.render(this.getTaggedFeatures(), this.heatmapEnabled);
  }
  setupEventListeners() {
    let e, i;
    const n = () => {
      this.guideRenderer.updatePositions(this.storage.getGuides());
    }, r = () => {
      this.featureHeatmapRenderer.updatePositions(this.getTaggedFeatures());
    };
    window.addEventListener("resize", () => {
      clearTimeout(e), e = window.setTimeout(() => {
        n(), r();
      }, 100);
    }), window.addEventListener(
      "scroll",
      () => {
        clearTimeout(i), i = window.setTimeout(() => {
          n(), r();
        }, 50);
      },
      !0
    ), window.addEventListener("popstate", () => this.handlePageChange());
    const o = history.pushState;
    o && (history.pushState = (...l) => {
      o.apply(history, l), this.handlePageChange();
    });
    const a = history.replaceState;
    a && (history.replaceState = (...l) => {
      a.apply(history, l), this.handlePageChange();
    }), document.addEventListener("click", (l) => this.handleGlobalClick(l), !0);
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
  renderOverlays() {
    this.ensureSDKRoot(), this.sdkRoot && js(this.sdkRoot, {
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
const ni = "1.0.0", kn = "rg-web-sdk", Ys = "web", Xs = 1, M = {
  VISITOR_ID: "__rg_visitor_id",
  ACCOUNT_ID: "__rg_account_id",
  SESSION_ID: "__rg_session_id",
  SESSION_START: "__rg_session_start",
  SESSION_LAST_ACTIVITY: "__rg_session_last_activity",
  EVENT_QUEUE: "__rg_event_queue",
  OPT_OUT: "__rg_opt_out",
  VISITOR_TRAITS: "__rg_visitor_traits",
  ACCOUNT_TRAITS: "__rg_account_traits"
}, Js = {
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
}, Ee = {
  PAGE_VIEW: "page_view",
  CLICK: "click",
  INPUT: "input",
  SCROLL: "scroll",
  ERROR: "error"
}, xe = {
  NAVIGATION: "navigation",
  ENGAGEMENT: "engagement",
  DIAGNOSTIC: "diagnostic"
}, $e = {
  NORMAL: "normal",
  RAGE_CLICK: "rage_click",
  ERROR_CLICK: "error_click",
  U_TURN: "u_turn"
}, ze = {
  rageClickThreshold: 3,
  rageClickWindow: 1e3,
  deadClickDelay: 300,
  errorClickWindow: 2e3,
  uturnThreshold: 5e3
}, St = [1e3, 2e3, 5e3, 1e4, 3e4], Ki = 5, Zs = 1e3, eo = 100, to = {
  click: { limit: 100, window: 1e3 },
  scroll: { limit: 10, window: 1e3 },
  input: { limit: 50, window: 1e3 }
}, Et = {
  pageView: 100,
  scroll: 500
}, Be = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
};
function We() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (t) => {
    const e = Math.random() * 16 | 0;
    return (t === "x" ? e : e & 3 | 8).toString(16);
  });
}
function Ke() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function io() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function no() {
  const t = navigator.userAgent;
  return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(t) ? "tablet" : /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silfae|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(t) ? "mobile" : "desktop";
}
function ro() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Chrome") > -1 && t.indexOf("Edg") === -1 ? (e = "Chrome", i = t.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Safari") > -1 && t.indexOf("Chrome") === -1 ? (e = "Safari", i = t.match(/Version\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Firefox") > -1 ? (e = "Firefox", i = t.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Edg") > -1 ? (e = "Edge", i = t.match(/Edg\/([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("MSIE") > -1 || t.indexOf("Trident") > -1) && (e = "Internet Explorer", i = t.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || "Unknown"), { browserName: e, browserVersion: i };
}
function so() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Win") > -1 ? (e = "Windows", t.indexOf("Windows NT 10.0") > -1 ? i = "10" : t.indexOf("Windows NT 6.3") > -1 ? i = "8.1" : t.indexOf("Windows NT 6.2") > -1 ? i = "8" : t.indexOf("Windows NT 6.1") > -1 && (i = "7")) : t.indexOf("Mac") > -1 ? (e = "macOS", i = t.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : t.indexOf("Linux") > -1 ? e = "Linux" : t.indexOf("Android") > -1 ? (e = "Android", i = t.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("iOS") > -1 || t.indexOf("iPhone") > -1 || t.indexOf("iPad") > -1) && (e = "iOS", i = t.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), { osName: e, osVersion: i };
}
function oo() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Unknown";
  }
}
function ao(t) {
  try {
    const e = new URL(t), i = {};
    return e.searchParams.forEach((n, r) => {
      i[r] = n;
    }), i;
  } catch {
    return {};
  }
}
function $t(t, e = 200) {
  return t ? t.length > e ? t.substring(0, e) : t : null;
}
function Wt(t, ...e) {
  return Object.assign({}, t, ...e);
}
function Qi(t, e) {
  let i;
  return function(...r) {
    const o = () => {
      clearTimeout(i), t(...r);
    };
    clearTimeout(i), i = setTimeout(o, e);
  };
}
function lo(t, e = null) {
  try {
    return JSON.parse(t);
  } catch {
    return e;
  }
}
function xt(t, e = null) {
  try {
    return JSON.stringify(t);
  } catch {
    return e;
  }
}
function g(t, ...e) {
  typeof console < "u" && console[t] && console[t]("[RG SDK]", ...e);
}
function co(t) {
  if (!t) return null;
  if (t.id)
    return `//*[@id="${t.id}"]`;
  const e = [];
  let i = t;
  for (; i && i.nodeType === Node.ELEMENT_NODE; ) {
    let n = 1, r = i.previousSibling;
    for (; r; )
      r.nodeType === Node.ELEMENT_NODE && r.tagName === i.tagName && n++, r = r.previousSibling;
    const o = i.tagName.toLowerCase();
    e.unshift(`${o}[${n}]`), i = i.parentNode;
  }
  return e.length > 0 ? "/" + e.join("/") : null;
}
function uo(t) {
  if (!t) return null;
  if (t.id)
    return `#${CSS.escape(t.id)}`;
  const e = [];
  let i = t;
  for (; i && i.nodeType === Node.ELEMENT_NODE; ) {
    let n = i.tagName.toLowerCase();
    if (i.className && typeof i.className == "string") {
      const r = i.className.split(/\s+/).filter((o) => o && !/^[0-9]/.test(o)).map((o) => "." + CSS.escape(o)).join("");
      n += r;
    }
    e.unshift(n);
    try {
      if (document.querySelectorAll(e.join(" > ")).length === 1)
        break;
    } catch {
    }
    if (i = i.parentElement, e.length > 10) break;
  }
  return e.join(" > ") || null;
}
function ho(t) {
  if (!t) return null;
  const e = t.getAttribute("aria-label") || t.getAttribute("alt") || t.getAttribute("title") || (t.tagName === "INPUT" ? t.value : null) || t.textContent?.trim() || null;
  return $t(e, 200);
}
function fo(t) {
  if (!t) return !1;
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0";
}
class po {
  constructor(e = "localStorage") {
    this.preferredStorage = e, this.storageType = this._detectAvailableStorage(), this.memoryStorage = {};
  }
  _detectAvailableStorage() {
    return this.preferredStorage === "localStorage" && this._testStorage(window.localStorage) ? "localStorage" : this._testStorage(window.sessionStorage) ? "sessionStorage" : (g("warn", "No persistent storage available, using in-memory storage"), "memory");
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
      const n = this._getStorage(), r = xt(i);
      return r ? (n ? n.setItem(e, r) : this.memoryStorage[e] = r, !0) : (g("warn", "Failed to serialize value for key:", e), !1);
    } catch (n) {
      if (n.name === "QuotaExceededError") {
        g("warn", "Storage quota exceeded, attempting cleanup"), this._cleanup();
        try {
          const r = this._getStorage();
          return r ? r.setItem(e, xt(i)) : this.memoryStorage[e] = xt(i), !0;
        } catch (r) {
          return g("error", "Failed to set item after cleanup:", e, r), !1;
        }
      }
      return g("error", "Failed to set item:", e, n), !1;
    }
  }
  getItem(e) {
    try {
      const i = this._getStorage();
      let n;
      return i ? n = i.getItem(e) : n = this.memoryStorage[e], n == null ? null : lo(n, null);
    } catch (i) {
      return g("error", "Failed to get item:", e, i), null;
    }
  }
  removeItem(e) {
    try {
      const i = this._getStorage();
      return i ? i.removeItem(e) : delete this.memoryStorage[e], !0;
    } catch (i) {
      return g("error", "Failed to remove item:", e, i), !1;
    }
  }
  hasItem(e) {
    const i = this.getItem(e);
    return i != null;
  }
  clear() {
    try {
      const e = this._getStorage();
      return e ? Object.keys(e).forEach((n) => {
        n.startsWith("__rg_") && e.removeItem(n);
      }) : this.memoryStorage = {}, !0;
    } catch (e) {
      return g("error", "Failed to clear storage:", e), !1;
    }
  }
  _cleanup() {
    const e = this._getStorage();
    if (e)
      try {
        ["__rg_event_queue"].forEach((n) => {
          e.removeItem(n);
        });
      } catch (i) {
        g("error", "Cleanup failed:", i);
      }
  }
  getStorageType() {
    return this.storageType;
  }
  isPersistent() {
    return this.storageType !== "memory";
  }
}
class mo {
  constructor(e, i) {
    this.storage = e, this.config = i, this.visitorId = null, this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this.sessionId = null, this.sessionStartTime = null, this.sessionLastActivity = null, this.sessionEventCount = 0, this.sessionProperties = {}, this.pendingIdentity = null;
  }
  initialize() {
    this._loadVisitor(), this._loadAccount(), this._loadOrCreateSession(), this.pendingIdentity && (this.identify(this.pendingIdentity.visitor, this.pendingIdentity.account), this.pendingIdentity = null), g("info", "Identity initialized:", {
      visitorId: this.visitorId,
      accountId: this.accountId,
      sessionId: this.sessionId
    });
  }
  _loadVisitor() {
    const e = this.storage.getItem(M.VISITOR_ID), i = this.storage.getItem(M.VISITOR_TRAITS) || {};
    e ? (this.visitorId = e, this.visitorTraits = i) : (this.visitorId = "anon_" + We(), this._persistVisitor());
  }
  _loadAccount() {
    const e = this.storage.getItem(M.ACCOUNT_ID), i = this.storage.getItem(M.ACCOUNT_TRAITS) || {};
    e && (this.accountId = e, this.accountTraits = i);
  }
  _loadOrCreateSession() {
    const e = this.storage.getItem(M.SESSION_ID), i = this.storage.getItem(M.SESSION_START), n = this.storage.getItem(M.SESSION_LAST_ACTIVITY), r = Date.now(), o = this.config.sessionTimeout * 60 * 1e3;
    if (e && n && r - new Date(n).getTime() < o) {
      this.sessionId = e, this.sessionStartTime = i, this.sessionLastActivity = n, this._updateSessionActivity();
      return;
    }
    this._createNewSession();
  }
  _createNewSession() {
    this.sessionId = "sess_" + We(), this.sessionStartTime = Ke(), this.sessionLastActivity = Ke(), this.sessionEventCount = 0, this._captureSessionProperties(), this._persistSession(), g("info", "New session created:", this.sessionId);
  }
  _captureSessionProperties() {
    const e = window.location.href, i = ao(e);
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
    this.sessionLastActivity = Ke(), this.sessionEventCount++, this.storage.setItem(M.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  _persistVisitor() {
    this.storage.setItem(M.VISITOR_ID, this.visitorId), this.storage.setItem(M.VISITOR_TRAITS, this.visitorTraits);
  }
  _persistAccount() {
    this.accountId && (this.storage.setItem(M.ACCOUNT_ID, this.accountId), this.storage.setItem(M.ACCOUNT_TRAITS, this.accountTraits));
  }
  _persistSession() {
    this.storage.setItem(M.SESSION_ID, this.sessionId), this.storage.setItem(M.SESSION_START, this.sessionStartTime), this.storage.setItem(M.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  identify(e, i = null) {
    if (e && e.id) {
      this.visitorId && this.visitorId !== e.id && !this.visitorId.startsWith("anon_") && g("warn", `Visitor ID changed from ${this.visitorId} to ${e.id}`), this.visitorId = e.id;
      const { id: n, ...r } = e;
      this.visitorTraits = Wt(this.visitorTraits, r), this._persistVisitor();
    }
    if (i && i.id) {
      this.accountId && this.accountId !== i.id && g("info", `Account changed from ${this.accountId} to ${i.id}`), this.accountId = i.id;
      const { id: n, ...r } = i;
      this.accountTraits = Wt(this.accountTraits, r), this._persistAccount();
    }
    g("info", "Identity updated:", {
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
    for (const n in this.visitorTraits)
      e.includes(n) || (i[n] = this.visitorTraits[n]);
    return Object.keys(i).length > 0 ? i : null;
  }
  _getCustomAccountTraits() {
    const e = ["name", "plan", "mrr", "industry"], i = {};
    for (const n in this.accountTraits)
      e.includes(n) || (i[n] = this.accountTraits[n]);
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
    this.storage.removeItem(M.VISITOR_ID), this.storage.removeItem(M.VISITOR_TRAITS), this.storage.removeItem(M.ACCOUNT_ID), this.storage.removeItem(M.ACCOUNT_TRAITS), this.storage.removeItem(M.SESSION_ID), this.storage.removeItem(M.SESSION_START), this.storage.removeItem(M.SESSION_LAST_ACTIVITY), this.visitorId = "anon_" + We(), this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this._createNewSession(), this._persistVisitor(), g("info", "Identity reset");
  }
}
class go {
  constructor(e) {
    this.identityManager = e, this.deviceInfo = this._captureDeviceInfo();
  }
  _captureDeviceInfo() {
    const { browserName: e, browserVersion: i } = ro(), { osName: n, osVersion: r } = so();
    return {
      device_type: no(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      browser_name: e,
      browser_version: i,
      os_name: n,
      os_version: r,
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: oo()
    };
  }
  buildEvent(e) {
    const i = Ke(), n = this.identityManager.getIdentityContext(), r = {
      event_id: "evt_" + We(),
      visitor_id: n.visitor_id,
      account_id: n.account_id,
      session_id: n.session_id,
      event_name: e.event_name,
      event_type: e.event_type,
      timestamp: i,
      event_date: io(),
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
      session_start_time: n.session_start_time,
      session_duration_ms: n.session_duration_ms,
      session_event_count: n.session_event_count,
      visitor_email: n.visitor_email,
      visitor_name: n.visitor_name,
      visitor_role: n.visitor_role,
      visitor_created_at: n.visitor_created_at,
      visitor_custom: n.visitor_custom,
      account_name: n.account_name,
      account_plan: n.account_plan,
      account_mrr: n.account_mrr,
      account_industry: n.account_industry,
      account_custom: n.account_custom,
      ...this.deviceInfo,
      referrer: n.referrer,
      referrer_domain: n.referrer_domain,
      utm_source: n.utm_source,
      utm_medium: n.utm_medium,
      utm_campaign: n.utm_campaign,
      utm_term: n.utm_term,
      utm_content: n.utm_content,
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      properties: e.custom_properties || null,
      interaction_type: e.interaction_type || "normal",
      sdk_version: ni,
      sdk_name: kn,
      sdk_source: Ys,
      data_version: Xs,
      captured_at: i,
      error_message: e.error_message || null,
      error_stack: e.error_stack || null,
      console_logs: e.console_logs || null
    };
    return e.event_name === "click" && (r.element_position_x = e.click_x || null, r.element_position_y = e.click_y || null, r.click_button = e.click_button || null, r.modifier_alt = e.modifier_alt || !1, r.modifier_ctrl = e.modifier_ctrl || !1, r.modifier_shift = e.modifier_shift || !1, r.modifier_meta = e.modifier_meta || !1), e.event_name === "scroll" && (r.scroll_depth_percent = e.scroll_depth_percent || null, r.scroll_y = e.scroll_y || null, r.milestone_25 = e.milestone_25 || !1, r.milestone_50 = e.milestone_50 || !1, r.milestone_75 = e.milestone_75 || !1, r.milestone_100 = e.milestone_100 || !1), e.event_name === "input" && (r.element_type = e.element_type || null, r.element_name = e.element_name || null, r.element_placeholder = e.element_placeholder || null, r.form_id = e.form_id || null, r.form_name = e.form_name || null, r.field_value = null), e.event_name === "error" && (r.error_type = e.error_type || null, r.error_line = e.error_line || null, r.error_column = e.error_column || null, r.error_filename = e.error_filename || null), e._originalElement && (r._originalElement = e._originalElement), r;
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
class _o {
  constructor(e, i) {
    this.storage = e, this.config = i, this.consentGranted = !i.requireConsent;
  }
  processEvent(e) {
    return this.isOptedOut() || this.config.requireConsent && !this.consentGranted || this.isInDoNotProcessList(e.visitor_id) || e._originalElement && this.isSensitiveElement(e._originalElement) ? null : (e = this.maskPII(e), e = this.removeBlacklistedFields(e), delete e._originalElement, e);
  }
  isOptedOut() {
    return this.storage.getItem(M.OPT_OUT) === !0;
  }
  isInDoNotProcessList(e) {
    return this.config.doNotProcess?.includes(e) || !1;
  }
  isSensitiveElement(e) {
    if (!e) return !1;
    const i = this.config.privacyConfig?.sensitiveSelectors || [];
    for (const n of i)
      try {
        if (e.matches(n) || e.closest(n))
          return !0;
      } catch {
        g("warn", "Invalid sensitive selector:", n);
      }
    return !1;
  }
  maskPII(e) {
    const i = ["element_text", "error_message", "error_stack", "page_url", "page_title"];
    for (const n of i)
      e[n] && typeof e[n] == "string" && (e[n] = this.maskPIIInText(e[n]));
    return e.custom_properties && (e.custom_properties = this._maskPIIInObject(e.custom_properties)), e.console_logs && Array.isArray(e.console_logs) && (e.console_logs = e.console_logs.map((n) => this.maskPIIInText(n))), e;
  }
  maskPIIInText(e) {
    if (!e) return e;
    let i = e;
    i = i.replace(Be.email, "[EMAIL_REDACTED]"), i = i.replace(Be.phone, "[PHONE_REDACTED]"), i = i.replace(Be.ssn, "[SSN_REDACTED]"), i = i.replace(Be.creditCard, "[CC_REDACTED]"), i = i.replace(Be.ipAddress, "[IP_REDACTED]");
    const n = this.config.privacyConfig?.customPIIPatterns || [];
    for (const r of n)
      try {
        i = i.replace(r, "[REDACTED]");
      } catch {
        g("warn", "Invalid custom PII pattern:", r);
      }
    return i;
  }
  _maskPIIInObject(e) {
    if (!e || typeof e != "object") return e;
    const i = Array.isArray(e) ? [] : {};
    for (const n in e) {
      const r = e[n];
      typeof r == "string" ? i[n] = this.maskPIIInText(r) : typeof r == "object" && r !== null ? i[n] = this._maskPIIInObject(r) : i[n] = r;
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
    for (const n of i)
      delete e[n];
    return e;
  }
  shouldMaskInput() {
    return this.config.privacyConfig?.maskInputs !== !1;
  }
  shouldMaskTextContent() {
    return this.config.privacyConfig?.maskTextContent === !0;
  }
  grantConsent() {
    this.consentGranted = !0, g("info", "User consent granted");
  }
  revokeConsent() {
    this.consentGranted = !1, g("info", "User consent revoked");
  }
  optOut() {
    this.storage.setItem(M.OPT_OUT, !0), g("info", "User opted out");
  }
  optIn() {
    this.storage.removeItem(M.OPT_OUT), g("info", "User opted in");
  }
  validateEventSize(e) {
    const i = JSON.stringify(e).length, n = 10 * 1024;
    return i > n ? (g("warn", "Event exceeds max size, truncating:", i), this.truncateEvent(e)) : e;
  }
  truncateEvent(e) {
    return e.element_text && (e.element_text = $t(e.element_text, 100)), e.error_stack && (e.error_stack = $t(e.error_stack, 500)), e.console_logs && (e.console_logs = e.console_logs.slice(0, 5)), e.custom_properties && JSON.stringify(e.custom_properties).length > 5e3 && (e.custom_properties = { _truncated: !0 }), e;
  }
  sanitizeURL(e) {
    try {
      const i = new URL(e);
      return ["token", "key", "password", "secret", "api_key", "access_token"].forEach((r) => {
        i.searchParams.has(r) && i.searchParams.set(r, "[REDACTED]");
      }), i.toString();
    } catch {
      return e;
    }
  }
}
class yo {
  constructor() {
    this.clickHistory = [], this.deadClickTimers = /* @__PURE__ */ new Map(), this.recentErrors = [], this.navigationHistory = [], this._setupErrorListener(), this._setupNavigationListener();
  }
  detectClickInteraction(e, i) {
    const n = this._getElementKey(e), r = Date.now();
    return this._detectRageClick(n, r) ? $e.RAGE_CLICK : this._detectErrorClick(n, r) ? $e.ERROR_CLICK : (this._scheduleDeadClickCheck(e, n, r), $e.NORMAL);
  }
  detectUTurn() {
    const e = Date.now(), i = this.navigationHistory;
    if (i.length < 2) return !1;
    const n = i[i.length - 1], r = i[i.length - 2];
    return n.url === r.url && e - r.time < ze.uturnThreshold;
  }
  _detectRageClick(e, i) {
    return this.clickHistory.push({ elementKey: e, time: i }), this.clickHistory = this.clickHistory.filter(
      (r) => i - r.time < ze.rageClickWindow
    ), this.clickHistory.filter(
      (r) => r.elementKey === e
    ).length >= ze.rageClickThreshold;
  }
  _detectErrorClick(e, i) {
    return this.recentErrors = this.recentErrors.filter(
      (n) => i - n.time < ze.errorClickWindow
    ), this.recentErrors.length > 0;
  }
  _scheduleDeadClickCheck(e, i, n) {
    this.deadClickTimers.has(i) && clearTimeout(this.deadClickTimers.get(i));
    const r = setTimeout(() => {
      this._isDeadClick(e, n) && g("debug", "Dead click detected:", i), this.deadClickTimers.delete(i);
    }, ze.deadClickDelay);
    this.deadClickTimers.set(i, r);
  }
  _isDeadClick(e) {
    const i = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
    if (i.includes(e.tagName) || e.onclick || e.hasAttribute("onclick"))
      return !1;
    let n = e.parentElement;
    for (; n; ) {
      if (i.includes(n.tagName))
        return !1;
      n = n.parentElement;
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
    }, i = history.pushState, n = history.replaceState;
    history.pushState = function(...r) {
      i.apply(this, r), e();
    }, history.replaceState = function(...r) {
      n.apply(this, r), e();
    }, window.addEventListener("popstate", e);
  }
  _getElementKey(e) {
    if (e.id) return `#${e.id}`;
    const i = e.tagName?.toLowerCase(), n = (e.textContent || "").substring(0, 20), r = e.getBoundingClientRect();
    return `${i}:${n}:${Math.round(r.left)},${Math.round(r.top)}`;
  }
  destroy() {
    this.deadClickTimers.forEach((e) => clearTimeout(e)), this.deadClickTimers.clear(), this.clickHistory = [], this.recentErrors = [], this.navigationHistory = [];
  }
}
class vo {
  constructor(e, i, n) {
    this.eventBuilder = e, this.privacyEngine = i, this.config = n, this.listeners = [], this.lastPageViewTime = 0, this.lastPageViewUrl = null, this.scrollMilestones = {
      25: !1,
      50: !1,
      75: !1,
      100: !1
    }, this.rateLimiters = {}, this.onEventCapture = null, this.isRunning = !1, this.behavioralDetector = new yo();
  }
  start(e) {
    if (this.isRunning) {
      g("warn", "Auto-capture already running");
      return;
    }
    this.onEventCapture = e, this.isRunning = !0, this.config.autoPageViews && this._startPageViewTracking(), this.config.autoCapture && (this._startClickTracking(), this._startInputTracking(), this._startScrollTracking(), this._startErrorTracking()), g("info", "Auto-capture started");
  }
  stop() {
    this.isRunning && (this.listeners.forEach(({ target: e, event: i, handler: n, options: r }) => {
      e.removeEventListener(i, n, r);
    }), this.listeners = [], this.behavioralDetector && this.behavioralDetector.destroy(), this.isRunning = !1, g("info", "Auto-capture stopped"));
  }
  _addListener(e, i, n, r = !1) {
    e.addEventListener(i, n, r), this.listeners.push({ target: e, event: i, handler: n, options: r });
  }
  _checkRateLimit(e) {
    const i = to[e];
    if (!i) return !0;
    this.rateLimiters[e] || (this.rateLimiters[e] = []);
    const n = Date.now(), r = this.rateLimiters[e];
    return this.rateLimiters[e] = r.filter((o) => n - o < i.window), this.rateLimiters[e].length >= i.limit ? !1 : (this.rateLimiters[e].push(n), !0);
  }
  _emit(e) {
    if (!this.onEventCapture) return;
    const i = this.eventBuilder.buildEvent(e), n = this.privacyEngine.processEvent(i);
    n && this.onEventCapture(n);
  }
  _startPageViewTracking() {
    this._capturePageView();
    const e = history.pushState, i = history.replaceState, n = Qi(() => this._capturePageView(), Et.pageView);
    history.pushState = function(...r) {
      e.apply(this, r), n();
    }, history.replaceState = function(...r) {
      i.apply(this, r), n();
    }, this._addListener(window, "popstate", () => {
      n();
    }), this._addListener(window, "hashchange", () => {
      n();
    });
  }
  _capturePageView() {
    const e = Date.now(), i = window.location.href;
    if (e - this.lastPageViewTime < Et.pageView || i === this.lastPageViewUrl)
      return;
    this.lastPageViewTime = e, this.lastPageViewUrl = i, this.scrollMilestones = { 25: !1, 50: !1, 75: !1, 100: !1 };
    const n = this.behavioralDetector.detectUTurn();
    this._emit({
      event_name: Ee.PAGE_VIEW,
      event_type: xe.NAVIGATION,
      interaction_type: n ? $e.U_TURN : $e.NORMAL
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
    if (!fo(i))
      return;
    const n = this.behavioralDetector.detectClickInteraction(i, e), r = {
      event_name: Ee.CLICK,
      event_type: xe.ENGAGEMENT,
      element_id: i.id || null,
      element_class: i.classList ? Array.from(i.classList) : [],
      element_tag: i.tagName?.toLowerCase() || null,
      element_text: ho(i),
      element_href: i.href || i.closest("a")?.href || null,
      element_xpath: co(i),
      element_selector: uo(i),
      click_x: e.clientX,
      click_y: e.clientY,
      click_button: e.button,
      modifier_alt: e.altKey,
      modifier_ctrl: e.ctrlKey,
      modifier_shift: e.shiftKey,
      modifier_meta: e.metaKey,
      interaction_type: n,
      _originalElement: i
    };
    this._emit(r);
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
    const n = e.target;
    if (!this._isFormElement(n) || !this._checkRateLimit("input"))
      return;
    const r = {
      event_name: Ee.INPUT,
      event_type: xe.ENGAGEMENT,
      element_id: n.id || null,
      element_tag: n.tagName?.toLowerCase() || null,
      element_type: n.type || null,
      element_name: n.name || null,
      element_placeholder: n.placeholder || null,
      interaction_type: i,
      form_id: n.form?.id || null,
      form_name: n.form?.name || null,
      field_value: null,
      _originalElement: n
    };
    this._emit(r);
  }
  _isFormElement(e) {
    return ["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName);
  }
  _startScrollTracking() {
    const e = Qi(() => this._handleScroll(), Et.scroll);
    this._addListener(window, "scroll", e);
  }
  _handleScroll() {
    if (!this._checkRateLimit("scroll"))
      return;
    const e = document.documentElement.scrollHeight, i = window.pageYOffset || document.documentElement.scrollTop, n = window.innerHeight, r = e - n, o = r > 0 ? Math.round(i / r * 100) : 100;
    let a = !1;
    const l = { 25: !1, 50: !1, 75: !1, 100: !1 };
    o >= 25 && !this.scrollMilestones[25] && (l[25] = !0, this.scrollMilestones[25] = !0, a = !0), o >= 50 && !this.scrollMilestones[50] && (l[50] = !0, this.scrollMilestones[50] = !0, a = !0), o >= 75 && !this.scrollMilestones[75] && (l[75] = !0, this.scrollMilestones[75] = !0, a = !0), o >= 100 && !this.scrollMilestones[100] && (l[100] = !0, this.scrollMilestones[100] = !0, a = !0), a && this._emit({
      event_name: Ee.SCROLL,
      event_type: xe.ENGAGEMENT,
      scroll_depth_percent: o,
      scroll_y: i,
      milestone_25: l[25],
      milestone_50: l[50],
      milestone_75: l[75],
      milestone_100: l[100]
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
      event_name: Ee.ERROR,
      event_type: xe.DIAGNOSTIC,
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
      event_name: Ee.ERROR,
      event_type: xe.DIAGNOSTIC,
      error_message: i?.message || String(i),
      error_type: i?.name || "UnhandledRejection",
      error_stack: i?.stack || null
    });
  }
  capturePage(e, i = {}) {
    this._emit({
      event_name: Ee.PAGE_VIEW,
      event_type: xe.NAVIGATION,
      custom_properties: { page_name: e, ...i }
    });
  }
}
class bo {
  constructor(e) {
    this.storage = e, this.queue = [], this.maxSize = Zs, this.maxPersistedSize = eo, this._restore();
  }
  _restore() {
    try {
      const e = this.storage.getItem(M.EVENT_QUEUE);
      e && Array.isArray(e) && (this.queue = e, g("info", `Restored ${this.queue.length} events from storage`));
    } catch (e) {
      g("error", "Failed to restore events from storage:", e);
    }
  }
  _persist() {
    try {
      const e = this.queue.slice(-this.maxPersistedSize);
      this.storage.setItem(M.EVENT_QUEUE, e);
    } catch (e) {
      g("error", "Failed to persist events to storage:", e);
    }
  }
  enqueue(e) {
    if (this.queue.length >= this.maxSize) {
      const i = this.queue.shift();
      g("warn", "Event queue full, dropping oldest event:", i.event_id);
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
    return this.queue = [], this.storage.removeItem(M.EVENT_QUEUE), e;
  }
  size() {
    return this.queue.length;
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  clear() {
    this.queue = [], this.storage.removeItem(M.EVENT_QUEUE), g("info", "Event queue cleared");
  }
  getStats() {
    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      percentFull: Math.round(this.queue.length / this.maxSize * 100)
    };
  }
}
class wo {
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
    }, e), this._setupUnloadHandler(), g("info", "Transport layer started");
  }
  stop() {
    this.batchTimer && (clearInterval(this.batchTimer), this.batchTimer = null), g("info", "Transport layer stopped");
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
      batch_id: "batch_" + We(),
      events: i,
      event_count: i.length,
      batch_timestamp: Ke()
    };
  }
  async _sendBatch(e = null, i = 0) {
    if (e || (e = this._createBatch()), !(!e || e.events.length === 0)) {
      this.isSending = !0;
      try {
        const n = await this._makeRequest(e);
        n.ok ? (this.eventQueue.dequeue(e.events.length), this.stats.sent += e.events.length, g("info", `Batch sent successfully: ${e.events.length} events`)) : await this._handleErrorResponse(n, e, i);
      } catch (n) {
        this._handleNetworkError(n, e, i);
      } finally {
        this.isSending = !1;
      }
    }
  }
  async _makeRequest(e) {
    const i = `${this.config.apiHost}/raw-events`, n = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
      "X-RG-SDK-Version": ni,
      "X-RG-SDK-Name": kn
    };
    return fetch(i, {
      method: "POST",
      headers: n,
      body: JSON.stringify(e),
      keepalive: !0
    });
  }
  async _handleErrorResponse(e, i, n) {
    const r = e.status;
    if (r >= 400 && r < 500) {
      r === 401 ? g("error", "Invalid API key. Please check your configuration.") : g("error", `Client error (${r}), dropping batch`), this.eventQueue.dequeue(i.events.length), this.stats.failed += i.events.length;
      return;
    }
    (r === 429 || r >= 500) && this._scheduleRetry(i, n);
  }
  _handleNetworkError(e, i, n) {
    g("error", "Network error:", e.message), this._scheduleRetry(i, n);
  }
  _scheduleRetry(e, i) {
    if (i >= Ki) {
      g("error", `Max retries exceeded for batch ${e.batch_id}, dropping events`), this.eventQueue.dequeue(e.events.length), this.stats.failed += e.events.length;
      return;
    }
    const n = St[i] || St[St.length - 1], r = Date.now() + n;
    this.retryQueue.set(e.batch_id, {
      batch: e,
      retryCount: i + 1,
      nextRetry: r
    }), this.stats.retried++, g(
      "info",
      `Scheduling retry ${i + 1}/${Ki} for batch ${e.batch_id} in ${n}ms`
    ), setTimeout(() => {
      const o = this.retryQueue.get(e.batch_id);
      o && (this.retryQueue.delete(e.batch_id), this._sendBatch(o.batch, o.retryCount));
    }, n);
  }
  async flush() {
    if (!this.eventQueue.isEmpty()) {
      for (g("info", "Flushing event queue..."), this._isFlushRequested = !0; !this.eventQueue.isEmpty() && !this.isSending; )
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
        const i = `${this.config.apiHost}/raw-events`, n = JSON.stringify(e);
        navigator.sendBeacon(i, n) ? (this.eventQueue.dequeue(e.events.length), g("info", `Sent ${e.events.length} events via sendBeacon`)) : g("warn", "sendBeacon failed, events may be lost");
      } else
        g("warn", "sendBeacon not available, events may be lost");
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
class So {
  constructor() {
    this.initialized = !1, this.config = null, this.storage = null, this.identityManager = null, this.eventBuilder = null, this.privacyEngine = null, this.autoCaptureEngine = null, this.eventQueue = null, this.transportLayer = null, this.pendingIdentify = null;
  }
  initialize(e) {
    if (this.initialized) {
      g("warn", "SDK already initialized");
      return;
    }
    if (!e || !e.apiKey)
      throw new Error("API key is required");
    this.config = Wt(Js, e), g("info", "Initializing RG SDK...", {
      version: ni,
      config: this.config
    }), this._initializeModules(), this.initialized = !0, this.pendingIdentify && (this.identify(this.pendingIdentify.visitor, this.pendingIdentify.account), this.pendingIdentify = null), g("info", "RG SDK initialized successfully");
  }
  _initializeModules() {
    this.storage = new po(this.config.persistence), this.identityManager = new mo(this.storage, this.config), this.identityManager.initialize(), this.eventBuilder = new go(this.identityManager), this.privacyEngine = new _o(this.storage, this.config), this.eventQueue = new bo(this.storage), this.transportLayer = new wo(this.config, this.eventQueue), this.transportLayer.start(), this.autoCaptureEngine = new vo(
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
      this.pendingIdentify = { visitor: e, account: i }, g("info", "Identity queued, will be applied after initialization");
      return;
    }
    this.identityManager.identify(e, i);
  }
  track(e, i = {}) {
    if (!this.initialized) {
      g("warn", "SDK not initialized, cannot track event");
      return;
    }
    if (!e || typeof e != "string") {
      g("warn", "Event name is required and must be a string");
      return;
    }
    const n = this.eventBuilder.buildCustomEvent(e, i), r = this.privacyEngine.processEvent(n);
    if (r) {
      const o = this.privacyEngine.validateEventSize(r);
      this.eventQueue.enqueue(o), this.transportLayer.checkBatchSize();
    }
  }
  page(e = null, i = {}) {
    if (!this.initialized) {
      g("warn", "SDK not initialized, cannot track page view");
      return;
    }
    const n = { ...i };
    e && (n.page_name = e);
    const r = this.eventBuilder.buildPageViewEvent(n), o = this.privacyEngine.processEvent(r);
    if (o) {
      const a = this.privacyEngine.validateEventSize(o);
      this.eventQueue.enqueue(a), this.transportLayer.checkBatchSize();
    }
  }
  async flush() {
    if (!this.initialized) {
      g("warn", "SDK not initialized");
      return;
    }
    await this.transportLayer.flush();
  }
  optOut() {
    if (!this.initialized) {
      g("warn", "SDK not initialized");
      return;
    }
    this.autoCaptureEngine && this.autoCaptureEngine.stop(), this.eventQueue.clear(), this.privacyEngine.optOut(), g("info", "User opted out of tracking");
  }
  optIn() {
    if (!this.initialized) {
      g("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.optIn(), (this.config.autoCapture || this.config.autoPageViews) && this.autoCaptureEngine.start((e) => this._handleCapturedEvent(e)), g("info", "User opted in to tracking");
  }
  grantConsent() {
    if (!this.initialized) {
      g("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.grantConsent();
  }
  revokeConsent() {
    if (!this.initialized) {
      g("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.revokeConsent(), this.eventQueue.clear();
  }
  reset() {
    if (!this.initialized) {
      g("warn", "SDK not initialized");
      return;
    }
    this.identityManager.reset(), g("info", "Identity reset");
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
    this.config.debug = e, g("info", `Debug mode ${e ? "enabled" : "disabled"}`);
  }
}
const j = new So(), ie = {
  initialize: (t) => {
    j.initialize(t);
  },
  identify: (t, e) => {
    j.identify(t, e);
  },
  track: (t, e) => {
    j.track(t, e);
  },
  page: (t, e) => {
    j.page(t, e);
  },
  flush: () => j.flush(),
  optOut: () => {
    j.optOut();
  },
  optIn: () => {
    j.optIn();
  },
  grantConsent: () => {
    j.grantConsent();
  },
  revokeConsent: () => {
    j.revokeConsent();
  },
  reset: () => {
    j.reset();
  },
  getVisitorId: () => j.getVisitorId(),
  getAccountId: () => j.getAccountId(),
  getSessionId: () => j.getSessionId(),
  getStats: () => j.getStats(),
  debug: (t) => {
    j.debug(t);
  },
  version: "1.0.0"
};
typeof window < "u" && (window.rg = ie);
let W = null, On = !1;
const Rn = "designerGuideId", Pn = "designerTemplateId";
let An = null, Dn = null;
function Eo() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(Rn) : null;
  } catch {
    return null;
  }
}
function xo() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(Pn) : null;
  } catch {
    return null;
  }
}
function he(t) {
  return t?.apiKey ? ie.initialize(t) : console.warn("[Revgain] No apiKey found in config. Analytics will not start."), W || (W = new In({
    ...t,
    guideId: An ?? t?.guideId ?? Eo() ?? null,
    templateId: Dn ?? t?.templateId ?? xo() ?? null
  }), W.init(), W);
}
function ri(t, e) {
  ie.identify(t, e);
}
function si(t, e) {
  ie.track(t, e);
}
function at() {
  return W;
}
function Ln(t) {
  if (!t || !Array.isArray(t)) return;
  t.splice(0, t.length).forEach((i) => {
    if (!i || !Array.isArray(i) || i.length === 0) return;
    const n = i[0], r = i.slice(1);
    try {
      switch (n) {
        case "initialize":
        case "init":
          he(r[0]);
          break;
        case "identify":
          ri(r[0], r[1]);
          break;
        case "track":
          si(r[0], r[1]);
          break;
        case "enableEditor":
          (W ?? he()).enableEditor();
          break;
        case "disableEditor":
          W?.disableEditor();
          break;
        case "loadGuides":
          W?.loadGuides();
          break;
        case "getGuides":
          return W?.getGuides();
        default:
          typeof ie[n] == "function" ? ie[n](...r) : console.warn("[Revgain] Unknown snippet method:", n);
      }
    } catch (o) {
      console.error("[Revgain] Error processing queued call:", n, o);
    }
  });
}
if (typeof window < "u") {
  const t = window.revgain || window.visualDesigner;
  t && Array.isArray(t._q) && (On = !0, t.init = he, t.initialize = he, t.identify = ri, t.track = si, t.enableEditor = () => (W ?? he()).enableEditor(), t.disableEditor = () => W?.disableEditor(), t.loadGuides = () => W?.loadGuides(), t.getGuides = () => W?.getGuides(), t.getInstance = at, t.page = (e, i) => ie.page(e, i), t.flush = () => ie.flush(), t.reset = () => ie.reset(), Ln(t._q));
  try {
    const e = new URL(window.location.href), i = e.searchParams.get("designer"), n = e.searchParams.get("mode"), r = e.searchParams.get("iud"), o = e.searchParams.get("guide_id"), a = e.searchParams.get("template_id");
    (i === "true" || o != null || a != null) && console.log("[Revgain] URL params detected:", { designerParam: i, modeParam: n, guideIdParam: o }), i === "true" && (n && (window.__visualDesignerMode = n, localStorage.setItem("designerModeType", n)), localStorage.setItem("designerMode", "true"), r && localStorage.setItem(Sn, r), o != null && (An = o, localStorage.setItem(Rn, o)), a != null && (Dn = a, localStorage.setItem(Pn, a)), e.searchParams.delete("designer"), e.searchParams.delete("mode"), e.searchParams.delete("iud"), e.searchParams.delete("guide_id"), e.searchParams.delete("template_id"), window.history.replaceState({}, "", e.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !W && !On) {
  const t = localStorage.getItem("designerMode") === "true", e = () => {
    !W && t && he();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
if (typeof window < "u") {
  const t = {
    init: he,
    initialize: he,
    identify: ri,
    track: si,
    page: (e, i) => ie.page(e, i),
    flush: () => ie.flush(),
    reset: () => ie.reset(),
    getInstance: at,
    DesignerSDK: In,
    apiClient: ee,
    _processQueue: Ln,
    getGuideId: () => at()?.getGuideId() ?? null,
    getTemplateId: () => at()?.getTemplateId() ?? null,
    enableEditor: () => (W ?? he()).enableEditor(),
    disableEditor: () => W?.disableEditor(),
    analytics: ie
  };
  window.revgain = t, window.VisualDesigner = t;
}
export {
  In as DesignerSDK,
  Ln as _processQueue,
  ee as apiClient,
  at as getInstance,
  ri as identify,
  he as init,
  ie as rg,
  si as track
};
