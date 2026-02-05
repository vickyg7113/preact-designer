class je {
  static generateSelector(t) {
    if (t.id)
      return {
        selector: `#${this.escapeSelector(t.id)}`,
        confidence: "high",
        method: "id"
      };
    const i = this.generateContainsSelector(t);
    if (i) return i;
    const n = this.generatePathFromAnchorToElement(t);
    if (n) return n;
    if (t.hasAttribute("data-testid")) {
      const l = t.getAttribute("data-testid");
      return {
        selector: `[data-testid="${this.escapeAttribute(l)}"]`,
        confidence: "high",
        method: "data-testid"
      };
    }
    const r = this.getSemanticDataAttributes(t);
    if (r.length > 0) {
      const l = r[0], u = t.getAttribute(l);
      return {
        selector: `[${l}="${this.escapeAttribute(u)}"]`,
        confidence: "high",
        method: "data-attribute"
      };
    }
    const s = this.generateAriaSelector(t);
    if (s)
      return { selector: s, confidence: "medium", method: "aria" };
    const a = this.generatePathSelector(t);
    return a ? { selector: a, confidence: "medium", method: "path" } : {
      selector: t.tagName.toLowerCase(),
      confidence: "low",
      method: "tag"
    };
  }
  /** Generate absolute XPath for an element (e.g. /html[1]/body[1]/div[1]/...) */
  static getXPath(t) {
    if (t.id && document.querySelector(`#${CSS.escape(t.id)}`) === t)
      return `//*[@id="${t.id.replace(/"/g, '\\"')}"]`;
    const i = [];
    let n = t;
    for (; n && n !== document.documentElement; ) {
      const r = n.tagName.toLowerCase(), s = n.parentElement;
      if (!s) {
        i.unshift(r);
        break;
      }
      const l = Array.from(s.children).filter((u) => u.tagName === n.tagName).indexOf(n) + 1;
      i.unshift(`${r}[${l}]`), n = s;
    }
    return "/" + i.join("/");
  }
  static findElement(t) {
    try {
      if (t.startsWith("/") || t.startsWith("//"))
        return this.findElementByXPath(t);
      const i = this.parseContainsAndDescendant(t);
      if (i) {
        const r = this.findElementWithContains(i.anchorPart);
        if (!r) return null;
        if (i.descendantPart) {
          const s = r.querySelector(i.descendantPart);
          return s || null;
        }
        return r;
      }
      return t.match(/(.*):contains\('((?:[^'\\]|\\.)*)'\)$/) ? this.findElementWithContains(t) : document.querySelector(t);
    } catch {
      return null;
    }
  }
  /** "anchorPart:contains('x') > descendantPart" -> { anchorPart, descendantPart } */
  static parseContainsAndDescendant(t) {
    const i = t.match(/:contains\('((?:[^'\\]|\\.)*)'\)/);
    if (!i) return null;
    const n = t.indexOf(i[0]) + i[0].length, r = t.slice(n), s = r.indexOf(" > ");
    return s === -1 ? null : {
      anchorPart: t.slice(0, n + s).trim(),
      descendantPart: r.slice(s + 3).trim() || null
    };
  }
  static findElementByXPath(t) {
    try {
      return document.evaluate(t, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch {
      return null;
    }
  }
  static findElementWithContains(t) {
    const i = t.match(/(.*):contains\('((?:[^'\\]|\\.)*)'\)$/);
    if (!i) return null;
    const n = i[1].trim(), r = i[2].replace(/\\'/g, "'"), s = this.normalizeText(r), a = document.querySelectorAll(n);
    for (let l = 0; l < a.length; l++)
      if (this.normalizeText(a[l].textContent || "").includes(s)) return a[l];
    return null;
  }
  static validateSelector(t) {
    try {
      return this.findElement(t) !== null;
    } catch {
      return !1;
    }
  }
  static getSemanticDataAttributes(t) {
    const i = ["data-id", "data-name", "data-role", "data-component", "data-element"], n = [];
    for (const r of i)
      t.hasAttribute(r) && n.push(r);
    for (let r = 0; r < t.attributes.length; r++) {
      const s = t.attributes[r];
      s.name.startsWith("data-") && !n.includes(s.name) && n.push(s.name);
    }
    return n;
  }
  static generateAriaSelector(t) {
    const i = t.getAttribute("role"), n = t.getAttribute("aria-label");
    if (i) {
      let r = `[role="${this.escapeAttribute(i)}"]`;
      return n && (r += `[aria-label="${this.escapeAttribute(n)}"]`), r;
    }
    return null;
  }
  static generatePathSelector(t) {
    const i = [];
    let n = t;
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
      const s = n.parentElement;
      if (s) {
        const a = Array.from(s.children).filter(
          (l) => l.tagName === n.tagName
        );
        a.length > 1 && (r += `:nth-of-type(${a.indexOf(n) + 1})`);
      }
      if (i.unshift(r), n = s, i.length >= 5) break;
    }
    return i.length > 0 ? i.join(" > ") : null;
  }
  static normalizeText(t) {
    return (t || "").trim().replace(/\s+/g, " ");
  }
  /** Single segment: tag + classes + nth-of-type (no id) */
  static buildSegment(t) {
    let i = t.tagName.toLowerCase();
    if (t.className && typeof t.className == "string") {
      const r = t.className.split(/\s+/).filter((s) => s && !s.startsWith("designer-")).slice(0, 2);
      r.length > 0 && (i += "." + r.map((s) => this.escapeSelector(s)).join("."));
    }
    const n = t.parentElement;
    if (n) {
      const r = Array.from(n.children).filter((s) => s.tagName === t.tagName);
      r.length > 1 && (i += `:nth-of-type(${r.indexOf(t) + 1})`);
    }
    return i;
  }
  /** Path from ancestor down to element (inclusive): [ancestor, ..., element] */
  static getPathFromAncestorToElement(t, i) {
    const n = [];
    let r = i;
    for (; r && r !== t; )
      n.unshift(r), r = r.parentElement;
    return r === t && n.unshift(t), n;
  }
  /** Contains selector when element has meaningful text: path + :contains('text') */
  static generateContainsSelector(t) {
    const n = (t.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
    if (n.length < 2) return null;
    const r = this.generatePathSelector(t);
    if (!r) return null;
    const s = n.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return {
      selector: `${r}:contains('${s}')`,
      confidence: "high",
      method: "contains"
    };
  }
  /**
   * Find first ancestor (step by step) that has id or meaningful text.
   * Used when the selected element (e.g. icon) has no id and no text.
   */
  static findAnchor(t) {
    let i = t.parentElement;
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
  static generatePathFromAnchorToElement(t) {
    const i = this.findAnchor(t);
    if (!i) return null;
    const { anchor: n, hasId: r } = i, s = this.getPathFromAncestorToElement(n, t);
    if (s.length < 2 || s.length > 12) return null;
    const l = [];
    if (r) {
      l.push(`#${this.escapeSelector(n.id)}`);
      for (let u = 1; u < s.length; u++) l.push(this.buildSegment(s[u]));
    } else {
      const u = (n.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (u.length < 2) return null;
      const d = this.generatePathSelector(n);
      if (!d) return null;
      const h = u.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      l.push(`${d}:contains('${h}')`);
      for (let c = 1; c < s.length; c++) l.push(this.buildSegment(s[c]));
    }
    return {
      selector: l.join(" > "),
      confidence: "high",
      method: "path-from-anchor"
    };
  }
  static escapeSelector(t) {
    return typeof CSS < "u" && CSS.escape ? CSS.escape(t) : t.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }
  static escapeAttribute(t) {
    return t.replace(/"/g, '\\"').replace(/'/g, "\\'");
  }
}
function Vi(e) {
  const t = e.getBoundingClientRect(), i = {};
  for (let n = 0; n < e.attributes.length; n++) {
    const r = e.attributes[n];
    i[r.name] = r.value;
  }
  return {
    tagName: e.tagName.toLowerCase(),
    id: e.id || void 0,
    className: e.className?.toString() || void 0,
    textContent: e.textContent?.trim().substring(0, 50) || void 0,
    attributes: i,
    boundingRect: t
  };
}
function Mt(e) {
  const t = window.getComputedStyle(e);
  return t.display !== "none" && t.visibility !== "hidden" && t.opacity !== "0" && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().width > 0;
}
function Ge() {
  return window.location.pathname || "/";
}
function Yi() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Xi(e) {
  const t = e.getBoundingClientRect();
  return t.top >= 0 && t.left >= 0 && t.bottom <= (window.innerHeight || document.documentElement.clientHeight) && t.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function Ji(e) {
  Xi(e) || e.scrollIntoView({ behavior: "smooth", block: "center" });
}
const At = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class Zi {
  isActive = !1;
  highlightOverlay = null;
  messageCallback = null;
  activate(t) {
    this.isActive || (this.isActive = !0, this.messageCallback = t, this.createHighlightOverlay(), this.attachEventListeners(), this.addEditorStyles());
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
  handleMouseOver = (t) => {
    if (!this.isActive || !this.highlightOverlay) return;
    const i = t.target;
    if (!(!i || i === this.highlightOverlay)) {
      if (i.closest(At)) {
        this.hideHighlight();
        return;
      }
      if (!Mt(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (t) => {
    if (!this.isActive) return;
    const i = t.target;
    i && (i.closest(At) || (t.preventDefault(), t.stopPropagation(), t.stopImmediatePropagation(), Mt(i) && this.selectElement(i)));
  };
  handleKeyDown = (t) => {
    this.isActive && t.key === "Escape" && (this.messageCallback?.({ type: "CANCEL" }), this.hideHighlight());
  };
  highlightElement(t) {
    if (!this.highlightOverlay) return;
    const i = t.getBoundingClientRect(), n = window.pageXOffset || document.documentElement.scrollLeft, r = window.pageYOffset || document.documentElement.scrollTop;
    this.highlightOverlay.style.display = "block", this.highlightOverlay.style.left = `${i.left + n}px`, this.highlightOverlay.style.top = `${i.top + r}px`, this.highlightOverlay.style.width = `${i.width}px`, this.highlightOverlay.style.height = `${i.height}px`;
  }
  hideHighlight() {
    this.highlightOverlay && (this.highlightOverlay.style.display = "none");
  }
  selectElement(t) {
    this.highlightElement(t);
    const i = je.generateSelector(t), n = Vi(t), r = je.getXPath(t);
    this.messageCallback?.({
      type: "ELEMENT_SELECTED",
      selector: i.selector,
      elementInfo: n,
      xpath: r
    });
  }
  addEditorStyles() {
    const t = document.createElement("style");
    t.id = "designer-editor-styles", t.textContent = `
      * { user-select: none !important; -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; }
      a, button, input, textarea, select { pointer-events: auto !important; }
    `, document.head.appendChild(t);
  }
  removeEditorStyles() {
    document.getElementById("designer-editor-styles")?.remove();
  }
}
var Je, S, gi, de, Lt, yi, _i, vi, bt, lt, ct, bi, Ie = {}, wi = [], en = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, Fe = Array.isArray;
function J(e, t) {
  for (var i in t) e[i] = t[i];
  return e;
}
function wt(e) {
  e && e.parentNode && e.parentNode.removeChild(e);
}
function dt(e, t, i) {
  var n, r, s, a = {};
  for (s in t) s == "key" ? n = t[s] : s == "ref" ? r = t[s] : a[s] = t[s];
  if (arguments.length > 2 && (a.children = arguments.length > 3 ? Je.call(arguments, 2) : i), typeof e == "function" && e.defaultProps != null) for (s in e.defaultProps) a[s] === void 0 && (a[s] = e.defaultProps[s]);
  return We(e, a, n, r, null);
}
function We(e, t, i, n, r) {
  var s = { type: e, props: t, key: i, ref: n, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: r ?? ++gi, __i: -1, __u: 0 };
  return r == null && S.vnode != null && S.vnode(s), s;
}
function q(e) {
  return e.children;
}
function Z(e, t) {
  this.props = e, this.context = t;
}
function ve(e, t) {
  if (t == null) return e.__ ? ve(e.__, e.__i + 1) : null;
  for (var i; t < e.__k.length; t++) if ((i = e.__k[t]) != null && i.__e != null) return i.__e;
  return typeof e.type == "function" ? ve(e) : null;
}
function Si(e) {
  var t, i;
  if ((e = e.__) != null && e.__c != null) {
    for (e.__e = e.__c.base = null, t = 0; t < e.__k.length; t++) if ((i = e.__k[t]) != null && i.__e != null) {
      e.__e = e.__c.base = i.__e;
      break;
    }
    return Si(e);
  }
}
function ut(e) {
  (!e.__d && (e.__d = !0) && de.push(e) && !Ke.__r++ || Lt != S.debounceRendering) && ((Lt = S.debounceRendering) || yi)(Ke);
}
function Ke() {
  for (var e, t, i, n, r, s, a, l = 1; de.length; ) de.length > l && de.sort(_i), e = de.shift(), l = de.length, e.__d && (i = void 0, n = void 0, r = (n = (t = e).__v).__e, s = [], a = [], t.__P && ((i = J({}, n)).__v = n.__v + 1, S.vnode && S.vnode(i), St(t.__P, i, n, t.__n, t.__P.namespaceURI, 32 & n.__u ? [r] : null, s, r ?? ve(n), !!(32 & n.__u), a), i.__v = n.__v, i.__.__k[i.__i] = i, Ci(s, i, a), n.__e = n.__ = null, i.__e != r && Si(i)));
  Ke.__r = 0;
}
function xi(e, t, i, n, r, s, a, l, u, d, h) {
  var c, p, m, v, b, w, g, _ = n && n.__k || wi, I = t.length;
  for (u = tn(i, t, _, u, I), c = 0; c < I; c++) (m = i.__k[c]) != null && (p = m.__i == -1 ? Ie : _[m.__i] || Ie, m.__i = c, w = St(e, m, p, r, s, a, l, u, d, h), v = m.__e, m.ref && p.ref != m.ref && (p.ref && xt(p.ref, null, m), h.push(m.ref, m.__c || v, m)), b == null && v != null && (b = v), (g = !!(4 & m.__u)) || p.__k === m.__k ? u = Ei(m, u, e, g) : typeof m.type == "function" && w !== void 0 ? u = w : v && (u = v.nextSibling), m.__u &= -7);
  return i.__e = b, u;
}
function tn(e, t, i, n, r) {
  var s, a, l, u, d, h = i.length, c = h, p = 0;
  for (e.__k = new Array(r), s = 0; s < r; s++) (a = t[s]) != null && typeof a != "boolean" && typeof a != "function" ? (typeof a == "string" || typeof a == "number" || typeof a == "bigint" || a.constructor == String ? a = e.__k[s] = We(null, a, null, null, null) : Fe(a) ? a = e.__k[s] = We(q, { children: a }, null, null, null) : a.constructor === void 0 && a.__b > 0 ? a = e.__k[s] = We(a.type, a.props, a.key, a.ref ? a.ref : null, a.__v) : e.__k[s] = a, u = s + p, a.__ = e, a.__b = e.__b + 1, l = null, (d = a.__i = nn(a, i, u, c)) != -1 && (c--, (l = i[d]) && (l.__u |= 2)), l == null || l.__v == null ? (d == -1 && (r > h ? p-- : r < h && p++), typeof a.type != "function" && (a.__u |= 4)) : d != u && (d == u - 1 ? p-- : d == u + 1 ? p++ : (d > u ? p-- : p++, a.__u |= 4))) : e.__k[s] = null;
  if (c) for (s = 0; s < h; s++) (l = i[s]) != null && (2 & l.__u) == 0 && (l.__e == n && (n = ve(l)), Ti(l, l));
  return n;
}
function Ei(e, t, i, n) {
  var r, s;
  if (typeof e.type == "function") {
    for (r = e.__k, s = 0; r && s < r.length; s++) r[s] && (r[s].__ = e, t = Ei(r[s], t, i, n));
    return t;
  }
  e.__e != t && (n && (t && e.type && !t.parentNode && (t = ve(e)), i.insertBefore(e.__e, t || null)), t = e.__e);
  do
    t = t && t.nextSibling;
  while (t != null && t.nodeType == 8);
  return t;
}
function qe(e, t) {
  return t = t || [], e == null || typeof e == "boolean" || (Fe(e) ? e.some(function(i) {
    qe(i, t);
  }) : t.push(e)), t;
}
function nn(e, t, i, n) {
  var r, s, a, l = e.key, u = e.type, d = t[i], h = d != null && (2 & d.__u) == 0;
  if (d === null && l == null || h && l == d.key && u == d.type) return i;
  if (n > (h ? 1 : 0)) {
    for (r = i - 1, s = i + 1; r >= 0 || s < t.length; ) if ((d = t[a = r >= 0 ? r-- : s++]) != null && (2 & d.__u) == 0 && l == d.key && u == d.type) return a;
  }
  return -1;
}
function Ht(e, t, i) {
  t[0] == "-" ? e.setProperty(t, i ?? "") : e[t] = i == null ? "" : typeof i != "number" || en.test(t) ? i : i + "px";
}
function Le(e, t, i, n, r) {
  var s, a;
  e: if (t == "style") if (typeof i == "string") e.style.cssText = i;
  else {
    if (typeof n == "string" && (e.style.cssText = n = ""), n) for (t in n) i && t in i || Ht(e.style, t, "");
    if (i) for (t in i) n && i[t] == n[t] || Ht(e.style, t, i[t]);
  }
  else if (t[0] == "o" && t[1] == "n") s = t != (t = t.replace(vi, "$1")), a = t.toLowerCase(), t = a in e || t == "onFocusOut" || t == "onFocusIn" ? a.slice(2) : t.slice(2), e.l || (e.l = {}), e.l[t + s] = i, i ? n ? i.u = n.u : (i.u = bt, e.addEventListener(t, s ? ct : lt, s)) : e.removeEventListener(t, s ? ct : lt, s);
  else {
    if (r == "http://www.w3.org/2000/svg") t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if (t != "width" && t != "height" && t != "href" && t != "list" && t != "form" && t != "tabIndex" && t != "download" && t != "rowSpan" && t != "colSpan" && t != "role" && t != "popover" && t in e) try {
      e[t] = i ?? "";
      break e;
    } catch {
    }
    typeof i == "function" || (i == null || i === !1 && t[4] != "-" ? e.removeAttribute(t) : e.setAttribute(t, t == "popover" && i == 1 ? "" : i));
  }
}
function zt(e) {
  return function(t) {
    if (this.l) {
      var i = this.l[t.type + e];
      if (t.t == null) t.t = bt++;
      else if (t.t < i.u) return;
      return i(S.event ? S.event(t) : t);
    }
  };
}
function St(e, t, i, n, r, s, a, l, u, d) {
  var h, c, p, m, v, b, w, g, _, I, F, z, L, O, k, M, N, P = t.type;
  if (t.constructor !== void 0) return null;
  128 & i.__u && (u = !!(32 & i.__u), s = [l = t.__e = i.__e]), (h = S.__b) && h(t);
  e: if (typeof P == "function") try {
    if (g = t.props, _ = "prototype" in P && P.prototype.render, I = (h = P.contextType) && n[h.__c], F = h ? I ? I.props.value : h.__ : n, i.__c ? w = (c = t.__c = i.__c).__ = c.__E : (_ ? t.__c = c = new P(g, F) : (t.__c = c = new Z(g, F), c.constructor = P, c.render = sn), I && I.sub(c), c.state || (c.state = {}), c.__n = n, p = c.__d = !0, c.__h = [], c._sb = []), _ && c.__s == null && (c.__s = c.state), _ && P.getDerivedStateFromProps != null && (c.__s == c.state && (c.__s = J({}, c.__s)), J(c.__s, P.getDerivedStateFromProps(g, c.__s))), m = c.props, v = c.state, c.__v = t, p) _ && P.getDerivedStateFromProps == null && c.componentWillMount != null && c.componentWillMount(), _ && c.componentDidMount != null && c.__h.push(c.componentDidMount);
    else {
      if (_ && P.getDerivedStateFromProps == null && g !== m && c.componentWillReceiveProps != null && c.componentWillReceiveProps(g, F), t.__v == i.__v || !c.__e && c.shouldComponentUpdate != null && c.shouldComponentUpdate(g, c.__s, F) === !1) {
        for (t.__v != i.__v && (c.props = g, c.state = c.__s, c.__d = !1), t.__e = i.__e, t.__k = i.__k, t.__k.some(function(H) {
          H && (H.__ = t);
        }), z = 0; z < c._sb.length; z++) c.__h.push(c._sb[z]);
        c._sb = [], c.__h.length && a.push(c);
        break e;
      }
      c.componentWillUpdate != null && c.componentWillUpdate(g, c.__s, F), _ && c.componentDidUpdate != null && c.__h.push(function() {
        c.componentDidUpdate(m, v, b);
      });
    }
    if (c.context = F, c.props = g, c.__P = e, c.__e = !1, L = S.__r, O = 0, _) {
      for (c.state = c.__s, c.__d = !1, L && L(t), h = c.render(c.props, c.state, c.context), k = 0; k < c._sb.length; k++) c.__h.push(c._sb[k]);
      c._sb = [];
    } else do
      c.__d = !1, L && L(t), h = c.render(c.props, c.state, c.context), c.state = c.__s;
    while (c.__d && ++O < 25);
    c.state = c.__s, c.getChildContext != null && (n = J(J({}, n), c.getChildContext())), _ && !p && c.getSnapshotBeforeUpdate != null && (b = c.getSnapshotBeforeUpdate(m, v)), M = h, h != null && h.type === q && h.key == null && (M = ki(h.props.children)), l = xi(e, Fe(M) ? M : [M], t, i, n, r, s, a, l, u, d), c.base = t.__e, t.__u &= -161, c.__h.length && a.push(c), w && (c.__E = c.__ = null);
  } catch (H) {
    if (t.__v = null, u || s != null) if (H.then) {
      for (t.__u |= u ? 160 : 128; l && l.nodeType == 8 && l.nextSibling; ) l = l.nextSibling;
      s[s.indexOf(l)] = null, t.__e = l;
    } else {
      for (N = s.length; N--; ) wt(s[N]);
      ht(t);
    }
    else t.__e = i.__e, t.__k = i.__k, H.then || ht(t);
    S.__e(H, t, i);
  }
  else s == null && t.__v == i.__v ? (t.__k = i.__k, t.__e = i.__e) : l = t.__e = rn(i.__e, t, i, n, r, s, a, u, d);
  return (h = S.diffed) && h(t), 128 & t.__u ? void 0 : l;
}
function ht(e) {
  e && e.__c && (e.__c.__e = !0), e && e.__k && e.__k.forEach(ht);
}
function Ci(e, t, i) {
  for (var n = 0; n < i.length; n++) xt(i[n], i[++n], i[++n]);
  S.__c && S.__c(t, e), e.some(function(r) {
    try {
      e = r.__h, r.__h = [], e.some(function(s) {
        s.call(r);
      });
    } catch (s) {
      S.__e(s, r.__v);
    }
  });
}
function ki(e) {
  return typeof e != "object" || e == null || e.__b && e.__b > 0 ? e : Fe(e) ? e.map(ki) : J({}, e);
}
function rn(e, t, i, n, r, s, a, l, u) {
  var d, h, c, p, m, v, b, w = i.props || Ie, g = t.props, _ = t.type;
  if (_ == "svg" ? r = "http://www.w3.org/2000/svg" : _ == "math" ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), s != null) {
    for (d = 0; d < s.length; d++) if ((m = s[d]) && "setAttribute" in m == !!_ && (_ ? m.localName == _ : m.nodeType == 3)) {
      e = m, s[d] = null;
      break;
    }
  }
  if (e == null) {
    if (_ == null) return document.createTextNode(g);
    e = document.createElementNS(r, _, g.is && g), l && (S.__m && S.__m(t, s), l = !1), s = null;
  }
  if (_ == null) w === g || l && e.data == g || (e.data = g);
  else {
    if (s = s && Je.call(e.childNodes), !l && s != null) for (w = {}, d = 0; d < e.attributes.length; d++) w[(m = e.attributes[d]).name] = m.value;
    for (d in w) if (m = w[d], d != "children") {
      if (d == "dangerouslySetInnerHTML") c = m;
      else if (!(d in g)) {
        if (d == "value" && "defaultValue" in g || d == "checked" && "defaultChecked" in g) continue;
        Le(e, d, null, m, r);
      }
    }
    for (d in g) m = g[d], d == "children" ? p = m : d == "dangerouslySetInnerHTML" ? h = m : d == "value" ? v = m : d == "checked" ? b = m : l && typeof m != "function" || w[d] === m || Le(e, d, m, w[d], r);
    if (h) l || c && (h.__html == c.__html || h.__html == e.innerHTML) || (e.innerHTML = h.__html), t.__k = [];
    else if (c && (e.innerHTML = ""), xi(t.type == "template" ? e.content : e, Fe(p) ? p : [p], t, i, n, _ == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r, s, a, s ? s[0] : i.__k && ve(i, 0), l, u), s != null) for (d = s.length; d--; ) wt(s[d]);
    l || (d = "value", _ == "progress" && v == null ? e.removeAttribute("value") : v != null && (v !== e[d] || _ == "progress" && !v || _ == "option" && v != w[d]) && Le(e, d, v, w[d], r), d = "checked", b != null && b != e[d] && Le(e, d, b, w[d], r));
  }
  return e;
}
function xt(e, t, i) {
  try {
    if (typeof e == "function") {
      var n = typeof e.__u == "function";
      n && e.__u(), n && t == null || (e.__u = e(t));
    } else e.current = t;
  } catch (r) {
    S.__e(r, i);
  }
}
function Ti(e, t, i) {
  var n, r;
  if (S.unmount && S.unmount(e), (n = e.ref) && (n.current && n.current != e.__e || xt(n, null, t)), (n = e.__c) != null) {
    if (n.componentWillUnmount) try {
      n.componentWillUnmount();
    } catch (s) {
      S.__e(s, t);
    }
    n.base = n.__P = null;
  }
  if (n = e.__k) for (r = 0; r < n.length; r++) n[r] && Ti(n[r], t, i || typeof e.type != "function");
  i || wt(e.__e), e.__c = e.__ = e.__e = void 0;
}
function sn(e, t, i) {
  return this.constructor(e, i);
}
function be(e, t, i) {
  var n, r, s, a;
  t == document && (t = document.documentElement), S.__ && S.__(e, t), r = (n = !1) ? null : t.__k, s = [], a = [], St(t, e = t.__k = dt(q, null, [e]), r || Ie, Ie, t.namespaceURI, r ? null : t.firstChild ? Je.call(t.childNodes) : null, s, r ? r.__e : t.firstChild, n, a), Ci(s, e, a);
}
function Et(e) {
  function t(i) {
    var n, r;
    return this.getChildContext || (n = /* @__PURE__ */ new Set(), (r = {})[t.__c] = this, this.getChildContext = function() {
      return r;
    }, this.componentWillUnmount = function() {
      n = null;
    }, this.shouldComponentUpdate = function(s) {
      this.props.value != s.value && n.forEach(function(a) {
        a.__e = !0, ut(a);
      });
    }, this.sub = function(s) {
      n.add(s);
      var a = s.componentWillUnmount;
      s.componentWillUnmount = function() {
        n && n.delete(s), a && a.call(s);
      };
    }), i.children;
  }
  return t.__c = "__cC" + bi++, t.__ = e, t.Provider = t.__l = (t.Consumer = function(i, n) {
    return i.children(n);
  }).contextType = t, t;
}
Je = wi.slice, S = { __e: function(e, t, i, n) {
  for (var r, s, a; t = t.__; ) if ((r = t.__c) && !r.__) try {
    if ((s = r.constructor) && s.getDerivedStateFromError != null && (r.setState(s.getDerivedStateFromError(e)), a = r.__d), r.componentDidCatch != null && (r.componentDidCatch(e, n || {}), a = r.__d), a) return r.__E = r;
  } catch (l) {
    e = l;
  }
  throw e;
} }, gi = 0, Z.prototype.setState = function(e, t) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = J({}, this.state), typeof e == "function" && (e = e(J({}, i), this.props)), e && J(i, e), e != null && this.__v && (t && this._sb.push(t), ut(this));
}, Z.prototype.forceUpdate = function(e) {
  this.__v && (this.__e = !0, e && this.__h.push(e), ut(this));
}, Z.prototype.render = q, de = [], yi = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, _i = function(e, t) {
  return e.__v.__b - t.__v.__b;
}, Ke.__r = 0, vi = /(PointerCapture)$|Capture$/i, bt = 0, lt = zt(!1), ct = zt(!0), bi = 0;
var on = 0;
function o(e, t, i, n, r, s) {
  t || (t = {});
  var a, l, u = t;
  if ("ref" in u) for (l in u = {}, t) l == "ref" ? a = t[l] : u[l] = t[l];
  var d = { type: e, props: u, key: i, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --on, __i: -1, __u: 0, __source: r, __self: s };
  if (typeof e == "function" && (a = e.defaultProps)) for (l in a) u[l] === void 0 && (u[l] = a[l]);
  return S.vnode && S.vnode(d), d;
}
const C = {
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
function an({ guide: e, top: t, left: i, arrowStyle: n, onDismiss: r }) {
  return /* @__PURE__ */ o(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": e.id,
      style: {
        position: "absolute",
        background: C.bg,
        border: `2px solid ${C.primary}`,
        borderRadius: C.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: C.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: C.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: C.text,
        top: `${t}px`,
        left: `${i}px`,
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ o("div", { style: { marginBottom: 8 }, children: e.content }),
        /* @__PURE__ */ o(
          "button",
          {
            type: "button",
            onClick: r,
            style: {
              background: C.primary,
              color: C.bg,
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
        /* @__PURE__ */ o(
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
function ln(e) {
  const t = { position: "absolute" };
  switch (e) {
    case "top":
      return { ...t, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${C.primary} transparent transparent transparent` };
    case "bottom":
      return { ...t, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${C.primary} transparent` };
    case "left":
      return { ...t, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${C.primary}` };
    default:
      return { ...t, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${C.primary} transparent transparent` };
  }
}
function cn(e, t, i, n) {
  const r = e.getBoundingClientRect(), s = window.pageXOffset || document.documentElement.scrollLeft, a = window.pageYOffset || document.documentElement.scrollTop, l = window.innerWidth, u = window.innerHeight;
  let d = 0, h = 0;
  switch (t) {
    case "top":
      d = r.top + a - n - 12, h = r.left + s + r.width / 2 - i / 2;
      break;
    case "bottom":
      d = r.bottom + a + 12, h = r.left + s + r.width / 2 - i / 2;
      break;
    case "left":
      d = r.top + a + r.height / 2 - n / 2, h = r.left + s - i - 12;
      break;
    default:
      d = r.top + a + r.height / 2 - n / 2, h = r.right + s + 12;
      break;
  }
  return h < s ? h = s + 10 : h + i > s + l && (h = s + l - i - 10), d < a ? d = a + 10 : d + n > a + u && (d = a + u - n - 10), { top: d, left: h, arrowStyle: ln(t) };
}
class dn {
  container = null;
  onDismiss = () => {
  };
  lastGuides = [];
  dismissedThisSession = /* @__PURE__ */ new Set();
  setOnDismiss(t) {
    this.onDismiss = t;
  }
  renderGuides(t) {
    this.lastGuides = t;
    const i = Ge(), n = t.filter(
      (s) => s.page === i && s.status === "active" && !this.dismissedThisSession.has(s.id)
    );
    if (n.length === 0 || (this.ensureContainer(), !this.container)) return;
    const r = [];
    for (const s of n) {
      const a = je.findElement(s.selector);
      if (!a) continue;
      Ji(a);
      const l = cn(a, s.placement, 280, 80);
      r.push({ guide: s, target: a, pos: l });
    }
    be(
      /* @__PURE__ */ o(
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
            zIndex: C.zIndex.guides
          },
          children: r.map(({ guide: s, pos: a }) => /* @__PURE__ */ o(
            an,
            {
              guide: s,
              top: a.top,
              left: a.left,
              arrowStyle: a.arrowStyle,
              onDismiss: () => this.dismissGuide(s.id)
            },
            s.id
          ))
        }
      ),
      this.container
    );
  }
  updatePositions(t) {
    this.renderGuides(t);
  }
  dismissGuide(t) {
    this.dismissedThisSession.add(t), this.onDismiss(t), this.renderGuides(this.lastGuides);
  }
  clear() {
    this.dismissedThisSession.clear(), this.container && be(null, this.container);
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
const Ut = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function un({ feature: e, color: t, rect: i }) {
  return /* @__PURE__ */ o(
    "div",
    {
      className: "designer-feature-heatmap-overlay",
      title: e.featureName,
      style: {
        position: "fixed",
        left: i.left,
        top: i.top,
        width: i.width,
        height: i.height,
        backgroundColor: t,
        pointerEvents: "none",
        zIndex: C.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${t}`
      }
    }
  );
}
class hn {
  container = null;
  lastEnabled = !1;
  render(t, i) {
    if (this.lastEnabled = i, this.clear(), !i || t.length === 0) return;
    const n = t.filter((s) => (s.selector || "").trim() !== "");
    if (this.ensureContainer(), !this.container) return;
    const r = n.map((s, a) => {
      const l = je.findElement(s.selector);
      if (!l) return null;
      const u = l.getBoundingClientRect(), d = Ut[a % Ut.length];
      return { feature: s, rect: u, color: d };
    }).filter(Boolean);
    r.length !== 0 && be(
      /* @__PURE__ */ o(
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
            zIndex: C.zIndex.overlay - 1
          },
          children: r.map(({ feature: s, rect: a, color: l }) => /* @__PURE__ */ o(
            un,
            {
              feature: s,
              color: l,
              rect: {
                left: a.left,
                top: a.top,
                width: a.width,
                height: a.height
              }
            },
            s.id
          ))
        }
      ),
      this.container
    );
  }
  updatePositions(t) {
    this.render(t, this.lastEnabled);
  }
  clear() {
    this.container && be(null, this.container);
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
var we = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set(), this.subscribe = this.subscribe.bind(this);
  }
  subscribe(e) {
    return this.listeners.add(e), this.onSubscribe(), () => {
      this.listeners.delete(e), this.onUnsubscribe();
    };
  }
  hasListeners() {
    return this.listeners.size > 0;
  }
  onSubscribe() {
  }
  onUnsubscribe() {
  }
}, fn = {
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
  setTimeout: (e, t) => setTimeout(e, t),
  clearTimeout: (e) => clearTimeout(e),
  setInterval: (e, t) => setInterval(e, t),
  clearInterval: (e) => clearInterval(e)
}, pn = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = fn;
  #t = !1;
  setTimeoutProvider(e) {
    this.#e = e;
  }
  setTimeout(e, t) {
    return this.#e.setTimeout(e, t);
  }
  clearTimeout(e) {
    this.#e.clearTimeout(e);
  }
  setInterval(e, t) {
    return this.#e.setInterval(e, t);
  }
  clearInterval(e) {
    this.#e.clearInterval(e);
  }
}, ue = new pn();
function mn(e) {
  setTimeout(e, 0);
}
var he = typeof window > "u" || "Deno" in globalThis;
function $() {
}
function gn(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function ft(e) {
  return typeof e == "number" && e >= 0 && e !== 1 / 0;
}
function Pi(e, t) {
  return Math.max(e + (t || 0) - Date.now(), 0);
}
function oe(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function j(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function $t(e, t) {
  const {
    type: i = "all",
    exact: n,
    fetchStatus: r,
    predicate: s,
    queryKey: a,
    stale: l
  } = e;
  if (a) {
    if (n) {
      if (t.queryHash !== Ct(a, t.options))
        return !1;
    } else if (!Re(t.queryKey, a))
      return !1;
  }
  if (i !== "all") {
    const u = t.isActive();
    if (i === "active" && !u || i === "inactive" && u)
      return !1;
  }
  return !(typeof l == "boolean" && t.isStale() !== l || r && r !== t.state.fetchStatus || s && !s(t));
}
function Bt(e, t) {
  const { exact: i, status: n, predicate: r, mutationKey: s } = e;
  if (s) {
    if (!t.options.mutationKey)
      return !1;
    if (i) {
      if (fe(t.options.mutationKey) !== fe(s))
        return !1;
    } else if (!Re(t.options.mutationKey, s))
      return !1;
  }
  return !(n && t.state.status !== n || r && !r(t));
}
function Ct(e, t) {
  return (t?.queryKeyHashFn || fe)(e);
}
function fe(e) {
  return JSON.stringify(
    e,
    (t, i) => pt(i) ? Object.keys(i).sort().reduce((n, r) => (n[r] = i[r], n), {}) : i
  );
}
function Re(e, t) {
  return e === t ? !0 : typeof e != typeof t ? !1 : e && t && typeof e == "object" && typeof t == "object" ? Object.keys(t).every((i) => Re(e[i], t[i])) : !1;
}
var yn = Object.prototype.hasOwnProperty;
function Ii(e, t, i = 0) {
  if (e === t)
    return e;
  if (i > 500) return t;
  const n = Nt(e) && Nt(t);
  if (!n && !(pt(e) && pt(t))) return t;
  const s = (n ? e : Object.keys(e)).length, a = n ? t : Object.keys(t), l = a.length, u = n ? new Array(l) : {};
  let d = 0;
  for (let h = 0; h < l; h++) {
    const c = n ? h : a[h], p = e[c], m = t[c];
    if (p === m) {
      u[c] = p, (n ? h < s : yn.call(e, c)) && d++;
      continue;
    }
    if (p === null || m === null || typeof p != "object" || typeof m != "object") {
      u[c] = m;
      continue;
    }
    const v = Ii(p, m, i + 1);
    u[c] = v, v === p && d++;
  }
  return s === l && d === s ? e : u;
}
function Ve(e, t) {
  if (!t || Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const i in e)
    if (e[i] !== t[i])
      return !1;
  return !0;
}
function Nt(e) {
  return Array.isArray(e) && e.length === Object.keys(e).length;
}
function pt(e) {
  if (!Wt(e))
    return !1;
  const t = e.constructor;
  if (t === void 0)
    return !0;
  const i = t.prototype;
  return !(!Wt(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(e) !== Object.prototype);
}
function Wt(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function _n(e) {
  return new Promise((t) => {
    ue.setTimeout(t, e);
  });
}
function mt(e, t, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(e, t) : i.structuralSharing !== !1 ? Ii(e, t) : t;
}
function vn(e, t, i = 0) {
  const n = [...e, t];
  return i && n.length > i ? n.slice(1) : n;
}
function bn(e, t, i = 0) {
  const n = [t, ...e];
  return i && n.length > i ? n.slice(0, -1) : n;
}
var kt = /* @__PURE__ */ Symbol();
function Ri(e, t) {
  return !e.queryFn && t?.initialPromise ? () => t.initialPromise : !e.queryFn || e.queryFn === kt ? () => Promise.reject(new Error(`Missing queryFn: '${e.queryHash}'`)) : e.queryFn;
}
function Tt(e, t) {
  return typeof e == "function" ? e(...t) : !!e;
}
function wn(e, t, i) {
  let n = !1, r;
  return Object.defineProperty(e, "signal", {
    enumerable: !0,
    get: () => (r ??= t(), n || (n = !0, r.aborted ? i() : r.addEventListener("abort", i, { once: !0 })), r)
  }), e;
}
var Sn = class extends we {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (e) => {
      if (!he && window.addEventListener) {
        const t = () => e();
        return window.addEventListener("visibilitychange", t, !1), () => {
          window.removeEventListener("visibilitychange", t);
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
  setEventListener(e) {
    this.#i = e, this.#t?.(), this.#t = e((t) => {
      typeof t == "boolean" ? this.setFocused(t) : this.onFocus();
    });
  }
  setFocused(e) {
    this.#e !== e && (this.#e = e, this.onFocus());
  }
  onFocus() {
    const e = this.isFocused();
    this.listeners.forEach((t) => {
      t(e);
    });
  }
  isFocused() {
    return typeof this.#e == "boolean" ? this.#e : globalThis.document?.visibilityState !== "hidden";
  }
}, Pt = new Sn();
function gt() {
  let e, t;
  const i = new Promise((r, s) => {
    e = r, t = s;
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
    }), e(r);
  }, i.reject = (r) => {
    n({
      status: "rejected",
      reason: r
    }), t(r);
  }, i;
}
var xn = mn;
function En() {
  let e = [], t = 0, i = (l) => {
    l();
  }, n = (l) => {
    l();
  }, r = xn;
  const s = (l) => {
    t ? e.push(l) : r(() => {
      i(l);
    });
  }, a = () => {
    const l = e;
    e = [], l.length && r(() => {
      n(() => {
        l.forEach((u) => {
          i(u);
        });
      });
    });
  };
  return {
    batch: (l) => {
      let u;
      t++;
      try {
        u = l();
      } finally {
        t--, t || a();
      }
      return u;
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: (l) => (...u) => {
      s(() => {
        l(...u);
      });
    },
    schedule: s,
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
var A = En(), Cn = class extends we {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (e) => {
      if (!he && window.addEventListener) {
        const t = () => e(!0), i = () => e(!1);
        return window.addEventListener("online", t, !1), window.addEventListener("offline", i, !1), () => {
          window.removeEventListener("online", t), window.removeEventListener("offline", i);
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
  setEventListener(e) {
    this.#i = e, this.#t?.(), this.#t = e(this.setOnline.bind(this));
  }
  setOnline(e) {
    this.#e !== e && (this.#e = e, this.listeners.forEach((i) => {
      i(e);
    }));
  }
  isOnline() {
    return this.#e;
  }
}, Ye = new Cn();
function kn(e) {
  return Math.min(1e3 * 2 ** e, 3e4);
}
function Fi(e) {
  return (e ?? "online") === "online" ? Ye.isOnline() : !0;
}
var yt = class extends Error {
  constructor(e) {
    super("CancelledError"), this.revert = e?.revert, this.silent = e?.silent;
  }
};
function Oi(e) {
  let t = !1, i = 0, n;
  const r = gt(), s = () => r.status !== "pending", a = (b) => {
    if (!s()) {
      const w = new yt(b);
      p(w), e.onCancel?.(w);
    }
  }, l = () => {
    t = !0;
  }, u = () => {
    t = !1;
  }, d = () => Pt.isFocused() && (e.networkMode === "always" || Ye.isOnline()) && e.canRun(), h = () => Fi(e.networkMode) && e.canRun(), c = (b) => {
    s() || (n?.(), r.resolve(b));
  }, p = (b) => {
    s() || (n?.(), r.reject(b));
  }, m = () => new Promise((b) => {
    n = (w) => {
      (s() || d()) && b(w);
    }, e.onPause?.();
  }).then(() => {
    n = void 0, s() || e.onContinue?.();
  }), v = () => {
    if (s())
      return;
    let b;
    const w = i === 0 ? e.initialPromise : void 0;
    try {
      b = w ?? e.fn();
    } catch (g) {
      b = Promise.reject(g);
    }
    Promise.resolve(b).then(c).catch((g) => {
      if (s())
        return;
      const _ = e.retry ?? (he ? 0 : 3), I = e.retryDelay ?? kn, F = typeof I == "function" ? I(i, g) : I, z = _ === !0 || typeof _ == "number" && i < _ || typeof _ == "function" && _(i, g);
      if (t || !z) {
        p(g);
        return;
      }
      i++, e.onFail?.(i, g), _n(F).then(() => d() ? void 0 : m()).then(() => {
        t ? p(g) : v();
      });
    });
  };
  return {
    promise: r,
    status: () => r.status,
    cancel: a,
    continue: () => (n?.(), r),
    cancelRetry: l,
    continueRetry: u,
    canStart: h,
    start: () => (h() ? v() : m().then(v), r)
  };
}
var Di = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), ft(this.gcTime) && (this.#e = ue.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(e) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      e ?? (he ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (ue.clearTimeout(this.#e), this.#e = void 0);
  }
}, Tn = class extends Di {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(e) {
    super(), this.#a = !1, this.#o = e.defaultOptions, this.setOptions(e.options), this.observers = [], this.#r = e.client, this.#i = this.#r.getQueryCache(), this.queryKey = e.queryKey, this.queryHash = e.queryHash, this.#e = jt(this.options), this.state = e.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(e) {
    if (this.options = { ...this.#o, ...e }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const t = jt(this.options);
      t.data !== void 0 && (this.setState(
        Qt(t.data, t.dataUpdatedAt)
      ), this.#e = t);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(e, t) {
    const i = mt(this.state.data, e, this.options);
    return this.#s({
      data: i,
      type: "success",
      dataUpdatedAt: t?.updatedAt,
      manual: t?.manual
    }), i;
  }
  setState(e, t) {
    this.#s({ type: "setState", state: e, setStateOptions: t });
  }
  cancel(e) {
    const t = this.#n?.promise;
    return this.#n?.cancel(e), t ? t.then($).catch($) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({ silent: !0 });
  }
  reset() {
    this.destroy(), this.setState(this.#e);
  }
  isActive() {
    return this.observers.some(
      (e) => j(e.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === kt || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (e) => oe(e.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (e) => e.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(e = 0) {
    return this.state.data === void 0 ? !0 : e === "static" ? !1 : this.state.isInvalidated ? !0 : !Pi(this.state.dataUpdatedAt, e);
  }
  onFocus() {
    this.observers.find((t) => t.shouldFetchOnWindowFocus())?.refetch({ cancelRefetch: !1 }), this.#n?.continue();
  }
  onOnline() {
    this.observers.find((t) => t.shouldFetchOnReconnect())?.refetch({ cancelRefetch: !1 }), this.#n?.continue();
  }
  addObserver(e) {
    this.observers.includes(e) || (this.observers.push(e), this.clearGcTimeout(), this.#i.notify({ type: "observerAdded", query: this, observer: e }));
  }
  removeObserver(e) {
    this.observers.includes(e) && (this.observers = this.observers.filter((t) => t !== e), this.observers.length || (this.#n && (this.#a ? this.#n.cancel({ revert: !0 }) : this.#n.cancelRetry()), this.scheduleGc()), this.#i.notify({ type: "observerRemoved", query: this, observer: e }));
  }
  getObserversCount() {
    return this.observers.length;
  }
  invalidate() {
    this.state.isInvalidated || this.#s({ type: "invalidate" });
  }
  async fetch(e, t) {
    if (this.state.fetchStatus !== "idle" && // If the promise in the retryer is already rejected, we have to definitely
    // re-start the fetch; there is a chance that the query is still in a
    // pending state when that happens
    this.#n?.status() !== "rejected") {
      if (this.state.data !== void 0 && t?.cancelRefetch)
        this.cancel({ silent: !0 });
      else if (this.#n)
        return this.#n.continueRetry(), this.#n.promise;
    }
    if (e && this.setOptions(e), !this.options.queryFn) {
      const l = this.observers.find((u) => u.options.queryFn);
      l && this.setOptions(l.options);
    }
    const i = new AbortController(), n = (l) => {
      Object.defineProperty(l, "signal", {
        enumerable: !0,
        get: () => (this.#a = !0, i.signal)
      });
    }, r = () => {
      const l = Ri(this.options, t), d = (() => {
        const h = {
          client: this.#r,
          queryKey: this.queryKey,
          meta: this.meta
        };
        return n(h), h;
      })();
      return this.#a = !1, this.options.persister ? this.options.persister(
        l,
        d,
        this
      ) : l(d);
    }, a = (() => {
      const l = {
        fetchOptions: t,
        options: this.options,
        queryKey: this.queryKey,
        client: this.#r,
        state: this.state,
        fetchFn: r
      };
      return n(l), l;
    })();
    this.options.behavior?.onFetch(a, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#s({ type: "fetch", meta: a.fetchOptions?.meta }), this.#n = Oi({
      initialPromise: t?.initialPromise,
      fn: a.fetchFn,
      onCancel: (l) => {
        l instanceof yt && l.revert && this.setState({
          ...this.#t,
          fetchStatus: "idle"
        }), i.abort();
      },
      onFail: (l, u) => {
        this.#s({ type: "failed", failureCount: l, error: u });
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
      if (l instanceof yt) {
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
  #s(e) {
    const t = (i) => {
      switch (e.type) {
        case "failed":
          return {
            ...i,
            fetchFailureCount: e.failureCount,
            fetchFailureReason: e.error
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
            ...Mi(i.data, this.options),
            fetchMeta: e.meta ?? null
          };
        case "success":
          const n = {
            ...i,
            ...Qt(e.data, e.dataUpdatedAt),
            dataUpdateCount: i.dataUpdateCount + 1,
            ...!e.manual && {
              fetchStatus: "idle",
              fetchFailureCount: 0,
              fetchFailureReason: null
            }
          };
          return this.#t = e.manual ? n : void 0, n;
        case "error":
          const r = e.error;
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
            ...e.state
          };
      }
    };
    this.state = t(this.state), A.batch(() => {
      this.observers.forEach((i) => {
        i.onQueryUpdate();
      }), this.#i.notify({ query: this, type: "updated", action: e });
    });
  }
};
function Mi(e, t) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: Fi(t.networkMode) ? "fetching" : "paused",
    ...e === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function Qt(e, t) {
  return {
    data: e,
    dataUpdatedAt: t ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function jt(e) {
  const t = typeof e.initialData == "function" ? e.initialData() : e.initialData, i = t !== void 0, n = i ? typeof e.initialDataUpdatedAt == "function" ? e.initialDataUpdatedAt() : e.initialDataUpdatedAt : 0;
  return {
    data: t,
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
var Pn = class extends we {
  constructor(e, t) {
    super(), this.options = t, this.#e = e, this.#s = null, this.#a = gt(), this.bindMethods(), this.setOptions(t);
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
    this.listeners.size === 1 && (this.#t.addObserver(this), Gt(this.#t, this.options) ? this.#u() : this.updateResult(), this.#v());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return _t(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return _t(
      this.#t,
      this.options,
      this.options.refetchOnWindowFocus
    );
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set(), this.#b(), this.#w(), this.#t.removeObserver(this);
  }
  setOptions(e) {
    const t = this.options, i = this.#t;
    if (this.options = this.#e.defaultQueryOptions(e), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof j(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), t._defaulted && !Ve(this.options, t) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const n = this.hasListeners();
    n && Kt(
      this.#t,
      i,
      this.options,
      t
    ) && this.#u(), this.updateResult(), n && (this.#t !== i || j(this.options.enabled, this.#t) !== j(t.enabled, this.#t) || oe(this.options.staleTime, this.#t) !== oe(t.staleTime, this.#t)) && this.#g();
    const r = this.#y();
    n && (this.#t !== i || j(this.options.enabled, this.#t) !== j(t.enabled, this.#t) || r !== this.#l) && this.#_(r);
  }
  getOptimisticResult(e) {
    const t = this.#e.getQueryCache().build(this.#e, e), i = this.createResult(t, e);
    return Rn(this, i) && (this.#r = i, this.#o = this.options, this.#n = this.#t.state), i;
  }
  getCurrentResult() {
    return this.#r;
  }
  trackResult(e, t) {
    return new Proxy(e, {
      get: (i, n) => (this.trackProp(n), t?.(n), n === "promise" && (this.trackProp("data"), !this.options.experimental_prefetchInRender && this.#a.status === "pending" && this.#a.reject(
        new Error(
          "experimental_prefetchInRender feature flag is not enabled"
        )
      )), Reflect.get(i, n))
    });
  }
  trackProp(e) {
    this.#p.add(e);
  }
  getCurrentQuery() {
    return this.#t;
  }
  refetch({ ...e } = {}) {
    return this.fetch({
      ...e
    });
  }
  fetchOptimistic(e) {
    const t = this.#e.defaultQueryOptions(e), i = this.#e.getQueryCache().build(this.#e, t);
    return i.fetch().then(() => this.createResult(i, t));
  }
  fetch(e) {
    return this.#u({
      ...e,
      cancelRefetch: e.cancelRefetch ?? !0
    }).then(() => (this.updateResult(), this.#r));
  }
  #u(e) {
    this.#S();
    let t = this.#t.fetch(
      this.options,
      e
    );
    return e?.throwOnError || (t = t.catch($)), t;
  }
  #g() {
    this.#b();
    const e = oe(
      this.options.staleTime,
      this.#t
    );
    if (he || this.#r.isStale || !ft(e))
      return;
    const i = Pi(this.#r.dataUpdatedAt, e) + 1;
    this.#c = ue.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(e) {
    this.#w(), this.#l = e, !(he || j(this.options.enabled, this.#t) === !1 || !ft(this.#l) || this.#l === 0) && (this.#d = ue.setInterval(() => {
      (this.options.refetchIntervalInBackground || Pt.isFocused()) && this.#u();
    }, this.#l));
  }
  #v() {
    this.#g(), this.#_(this.#y());
  }
  #b() {
    this.#c && (ue.clearTimeout(this.#c), this.#c = void 0);
  }
  #w() {
    this.#d && (ue.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(e, t) {
    const i = this.#t, n = this.options, r = this.#r, s = this.#n, a = this.#o, u = e !== i ? e.state : this.#i, { state: d } = e;
    let h = { ...d }, c = !1, p;
    if (t._optimisticResults) {
      const k = this.hasListeners(), M = !k && Gt(e, t), N = k && Kt(e, i, t, n);
      (M || N) && (h = {
        ...h,
        ...Mi(d.data, e.options)
      }), t._optimisticResults === "isRestoring" && (h.fetchStatus = "idle");
    }
    let { error: m, errorUpdatedAt: v, status: b } = h;
    p = h.data;
    let w = !1;
    if (t.placeholderData !== void 0 && p === void 0 && b === "pending") {
      let k;
      r?.isPlaceholderData && t.placeholderData === a?.placeholderData ? (k = r.data, w = !0) : k = typeof t.placeholderData == "function" ? t.placeholderData(
        this.#f?.state.data,
        this.#f
      ) : t.placeholderData, k !== void 0 && (b = "success", p = mt(
        r?.data,
        k,
        t
      ), c = !0);
    }
    if (t.select && p !== void 0 && !w)
      if (r && p === s?.data && t.select === this.#m)
        p = this.#h;
      else
        try {
          this.#m = t.select, p = t.select(p), p = mt(r?.data, p, t), this.#h = p, this.#s = null;
        } catch (k) {
          this.#s = k;
        }
    this.#s && (m = this.#s, p = this.#h, v = Date.now(), b = "error");
    const g = h.fetchStatus === "fetching", _ = b === "pending", I = b === "error", F = _ && g, z = p !== void 0, O = {
      status: b,
      fetchStatus: h.fetchStatus,
      isPending: _,
      isSuccess: b === "success",
      isError: I,
      isInitialLoading: F,
      isLoading: F,
      data: p,
      dataUpdatedAt: h.dataUpdatedAt,
      error: m,
      errorUpdatedAt: v,
      failureCount: h.fetchFailureCount,
      failureReason: h.fetchFailureReason,
      errorUpdateCount: h.errorUpdateCount,
      isFetched: h.dataUpdateCount > 0 || h.errorUpdateCount > 0,
      isFetchedAfterMount: h.dataUpdateCount > u.dataUpdateCount || h.errorUpdateCount > u.errorUpdateCount,
      isFetching: g,
      isRefetching: g && !_,
      isLoadingError: I && !z,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: c,
      isRefetchError: I && z,
      isStale: It(e, t),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: j(t.enabled, e) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const k = O.data !== void 0, M = O.status === "error" && !k, N = (Q) => {
        M ? Q.reject(O.error) : k && Q.resolve(O.data);
      }, P = () => {
        const Q = this.#a = O.promise = gt();
        N(Q);
      }, H = this.#a;
      switch (H.status) {
        case "pending":
          e.queryHash === i.queryHash && N(H);
          break;
        case "fulfilled":
          (M || O.data !== H.value) && P();
          break;
        case "rejected":
          (!M || O.error !== H.reason) && P();
          break;
      }
    }
    return O;
  }
  updateResult() {
    const e = this.#r, t = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#f = this.#t), Ve(t, e))
      return;
    this.#r = t;
    const i = () => {
      if (!e)
        return !0;
      const { notifyOnChangeProps: n } = this.options, r = typeof n == "function" ? n() : n;
      if (r === "all" || !r && !this.#p.size)
        return !0;
      const s = new Set(
        r ?? this.#p
      );
      return this.options.throwOnError && s.add("error"), Object.keys(this.#r).some((a) => {
        const l = a;
        return this.#r[l] !== e[l] && s.has(l);
      });
    };
    this.#x({ listeners: i() });
  }
  #S() {
    const e = this.#e.getQueryCache().build(this.#e, this.options);
    if (e === this.#t)
      return;
    const t = this.#t;
    this.#t = e, this.#i = e.state, this.hasListeners() && (t?.removeObserver(this), e.addObserver(this));
  }
  onQueryUpdate() {
    this.updateResult(), this.hasListeners() && this.#v();
  }
  #x(e) {
    A.batch(() => {
      e.listeners && this.listeners.forEach((t) => {
        t(this.#r);
      }), this.#e.getQueryCache().notify({
        query: this.#t,
        type: "observerResultsUpdated"
      });
    });
  }
};
function In(e, t) {
  return j(t.enabled, e) !== !1 && e.state.data === void 0 && !(e.state.status === "error" && t.retryOnMount === !1);
}
function Gt(e, t) {
  return In(e, t) || e.state.data !== void 0 && _t(e, t, t.refetchOnMount);
}
function _t(e, t, i) {
  if (j(t.enabled, e) !== !1 && oe(t.staleTime, e) !== "static") {
    const n = typeof i == "function" ? i(e) : i;
    return n === "always" || n !== !1 && It(e, t);
  }
  return !1;
}
function Kt(e, t, i, n) {
  return (e !== t || j(n.enabled, e) === !1) && (!i.suspense || e.state.status !== "error") && It(e, i);
}
function It(e, t) {
  return j(t.enabled, e) !== !1 && e.isStaleByTime(oe(t.staleTime, e));
}
function Rn(e, t) {
  return !Ve(e.getCurrentResult(), t);
}
function qt(e) {
  return {
    onFetch: (t, i) => {
      const n = t.options, r = t.fetchOptions?.meta?.fetchMore?.direction, s = t.state.data?.pages || [], a = t.state.data?.pageParams || [];
      let l = { pages: [], pageParams: [] }, u = 0;
      const d = async () => {
        let h = !1;
        const c = (v) => {
          wn(
            v,
            () => t.signal,
            () => h = !0
          );
        }, p = Ri(t.options, t.fetchOptions), m = async (v, b, w) => {
          if (h)
            return Promise.reject();
          if (b == null && v.pages.length)
            return Promise.resolve(v);
          const _ = (() => {
            const L = {
              client: t.client,
              queryKey: t.queryKey,
              pageParam: b,
              direction: w ? "backward" : "forward",
              meta: t.options.meta
            };
            return c(L), L;
          })(), I = await p(_), { maxPages: F } = t.options, z = w ? bn : vn;
          return {
            pages: z(v.pages, I, F),
            pageParams: z(v.pageParams, b, F)
          };
        };
        if (r && s.length) {
          const v = r === "backward", b = v ? Fn : Vt, w = {
            pages: s,
            pageParams: a
          }, g = b(n, w);
          l = await m(w, g, v);
        } else {
          const v = e ?? s.length;
          do {
            const b = u === 0 ? a[0] ?? n.initialPageParam : Vt(n, l);
            if (u > 0 && b == null)
              break;
            l = await m(l, b), u++;
          } while (u < v);
        }
        return l;
      };
      t.options.persister ? t.fetchFn = () => t.options.persister?.(
        d,
        {
          client: t.client,
          queryKey: t.queryKey,
          meta: t.options.meta,
          signal: t.signal
        },
        i
      ) : t.fetchFn = d;
    }
  };
}
function Vt(e, { pages: t, pageParams: i }) {
  const n = t.length - 1;
  return t.length > 0 ? e.getNextPageParam(
    t[n],
    t,
    i[n],
    i
  ) : void 0;
}
function Fn(e, { pages: t, pageParams: i }) {
  return t.length > 0 ? e.getPreviousPageParam?.(t[0], t, i[0], i) : void 0;
}
var On = class extends Di {
  #e;
  #t;
  #i;
  #r;
  constructor(e) {
    super(), this.#e = e.client, this.mutationId = e.mutationId, this.#i = e.mutationCache, this.#t = [], this.state = e.state || Ai(), this.setOptions(e.options), this.scheduleGc();
  }
  setOptions(e) {
    this.options = e, this.updateGcTime(this.options.gcTime);
  }
  get meta() {
    return this.options.meta;
  }
  addObserver(e) {
    this.#t.includes(e) || (this.#t.push(e), this.clearGcTimeout(), this.#i.notify({
      type: "observerAdded",
      mutation: this,
      observer: e
    }));
  }
  removeObserver(e) {
    this.#t = this.#t.filter((t) => t !== e), this.scheduleGc(), this.#i.notify({
      type: "observerRemoved",
      mutation: this,
      observer: e
    });
  }
  optionalRemove() {
    this.#t.length || (this.state.status === "pending" ? this.scheduleGc() : this.#i.remove(this));
  }
  continue() {
    return this.#r?.continue() ?? // continuing a mutation assumes that variables are set, mutation must have been dehydrated before
    this.execute(this.state.variables);
  }
  async execute(e) {
    const t = () => {
      this.#n({ type: "continue" });
    }, i = {
      client: this.#e,
      meta: this.options.meta,
      mutationKey: this.options.mutationKey
    };
    this.#r = Oi({
      fn: () => this.options.mutationFn ? this.options.mutationFn(e, i) : Promise.reject(new Error("No mutationFn found")),
      onFail: (s, a) => {
        this.#n({ type: "failed", failureCount: s, error: a });
      },
      onPause: () => {
        this.#n({ type: "pause" });
      },
      onContinue: t,
      retry: this.options.retry ?? 0,
      retryDelay: this.options.retryDelay,
      networkMode: this.options.networkMode,
      canRun: () => this.#i.canRun(this)
    });
    const n = this.state.status === "pending", r = !this.#r.canStart();
    try {
      if (n)
        t();
      else {
        this.#n({ type: "pending", variables: e, isPaused: r }), this.#i.config.onMutate && await this.#i.config.onMutate(
          e,
          this,
          i
        );
        const a = await this.options.onMutate?.(
          e,
          i
        );
        a !== this.state.context && this.#n({
          type: "pending",
          context: a,
          variables: e,
          isPaused: r
        });
      }
      const s = await this.#r.start();
      return await this.#i.config.onSuccess?.(
        s,
        e,
        this.state.context,
        this,
        i
      ), await this.options.onSuccess?.(
        s,
        e,
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
        e,
        this.state.context,
        i
      ), this.#n({ type: "success", data: s }), s;
    } catch (s) {
      try {
        await this.#i.config.onError?.(
          s,
          e,
          this.state.context,
          this,
          i
        );
      } catch (a) {
        Promise.reject(a);
      }
      try {
        await this.options.onError?.(
          s,
          e,
          this.state.context,
          i
        );
      } catch (a) {
        Promise.reject(a);
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
      } catch (a) {
        Promise.reject(a);
      }
      try {
        await this.options.onSettled?.(
          void 0,
          s,
          e,
          this.state.context,
          i
        );
      } catch (a) {
        Promise.reject(a);
      }
      throw this.#n({ type: "error", error: s }), s;
    } finally {
      this.#i.runNext(this);
    }
  }
  #n(e) {
    const t = (i) => {
      switch (e.type) {
        case "failed":
          return {
            ...i,
            failureCount: e.failureCount,
            failureReason: e.error
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
            context: e.context,
            data: void 0,
            failureCount: 0,
            failureReason: null,
            error: null,
            isPaused: e.isPaused,
            status: "pending",
            variables: e.variables,
            submittedAt: Date.now()
          };
        case "success":
          return {
            ...i,
            data: e.data,
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
            error: e.error,
            failureCount: i.failureCount + 1,
            failureReason: e.error,
            isPaused: !1,
            status: "error"
          };
      }
    };
    this.state = t(this.state), A.batch(() => {
      this.#t.forEach((i) => {
        i.onMutationUpdate(e);
      }), this.#i.notify({
        mutation: this,
        type: "updated",
        action: e
      });
    });
  }
};
function Ai() {
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
var Dn = class extends we {
  constructor(e = {}) {
    super(), this.config = e, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(e, t, i) {
    const n = new On({
      client: e,
      mutationCache: this,
      mutationId: ++this.#i,
      options: e.defaultMutationOptions(t),
      state: i
    });
    return this.add(n), n;
  }
  add(e) {
    this.#e.add(e);
    const t = He(e);
    if (typeof t == "string") {
      const i = this.#t.get(t);
      i ? i.push(e) : this.#t.set(t, [e]);
    }
    this.notify({ type: "added", mutation: e });
  }
  remove(e) {
    if (this.#e.delete(e)) {
      const t = He(e);
      if (typeof t == "string") {
        const i = this.#t.get(t);
        if (i)
          if (i.length > 1) {
            const n = i.indexOf(e);
            n !== -1 && i.splice(n, 1);
          } else i[0] === e && this.#t.delete(t);
      }
    }
    this.notify({ type: "removed", mutation: e });
  }
  canRun(e) {
    const t = He(e);
    if (typeof t == "string") {
      const n = this.#t.get(t)?.find(
        (r) => r.state.status === "pending"
      );
      return !n || n === e;
    } else
      return !0;
  }
  runNext(e) {
    const t = He(e);
    return typeof t == "string" ? this.#t.get(t)?.find((n) => n !== e && n.state.isPaused)?.continue() ?? Promise.resolve() : Promise.resolve();
  }
  clear() {
    A.batch(() => {
      this.#e.forEach((e) => {
        this.notify({ type: "removed", mutation: e });
      }), this.#e.clear(), this.#t.clear();
    });
  }
  getAll() {
    return Array.from(this.#e);
  }
  find(e) {
    const t = { exact: !0, ...e };
    return this.getAll().find(
      (i) => Bt(t, i)
    );
  }
  findAll(e = {}) {
    return this.getAll().filter((t) => Bt(e, t));
  }
  notify(e) {
    A.batch(() => {
      this.listeners.forEach((t) => {
        t(e);
      });
    });
  }
  resumePausedMutations() {
    const e = this.getAll().filter((t) => t.state.isPaused);
    return A.batch(
      () => Promise.all(
        e.map((t) => t.continue().catch($))
      )
    );
  }
};
function He(e) {
  return e.options.scope?.id;
}
var Mn = class extends we {
  #e;
  #t = void 0;
  #i;
  #r;
  constructor(e, t) {
    super(), this.#e = e, this.setOptions(t), this.bindMethods(), this.#n();
  }
  bindMethods() {
    this.mutate = this.mutate.bind(this), this.reset = this.reset.bind(this);
  }
  setOptions(e) {
    const t = this.options;
    this.options = this.#e.defaultMutationOptions(e), Ve(this.options, t) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), t?.mutationKey && this.options.mutationKey && fe(t.mutationKey) !== fe(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
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
  mutate(e, t) {
    return this.#r = t, this.#i?.removeObserver(this), this.#i = this.#e.getMutationCache().build(this.#e, this.options), this.#i.addObserver(this), this.#i.execute(e);
  }
  #n() {
    const e = this.#i?.state ?? Ai();
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
    A.batch(() => {
      if (this.#r && this.hasListeners()) {
        const t = this.#t.variables, i = this.#t.context, n = {
          client: this.#e,
          meta: this.options.meta,
          mutationKey: this.options.mutationKey
        };
        if (e?.type === "success") {
          try {
            this.#r.onSuccess?.(
              e.data,
              t,
              i,
              n
            );
          } catch (r) {
            Promise.reject(r);
          }
          try {
            this.#r.onSettled?.(
              e.data,
              null,
              t,
              i,
              n
            );
          } catch (r) {
            Promise.reject(r);
          }
        } else if (e?.type === "error") {
          try {
            this.#r.onError?.(
              e.error,
              t,
              i,
              n
            );
          } catch (r) {
            Promise.reject(r);
          }
          try {
            this.#r.onSettled?.(
              void 0,
              e.error,
              t,
              i,
              n
            );
          } catch (r) {
            Promise.reject(r);
          }
        }
      }
      this.listeners.forEach((t) => {
        t(this.#t);
      });
    });
  }
}, An = class extends we {
  constructor(e = {}) {
    super(), this.config = e, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(e, t, i) {
    const n = t.queryKey, r = t.queryHash ?? Ct(n, t);
    let s = this.get(r);
    return s || (s = new Tn({
      client: e,
      queryKey: n,
      queryHash: r,
      options: e.defaultQueryOptions(t),
      state: i,
      defaultOptions: e.getQueryDefaults(n)
    }), this.add(s)), s;
  }
  add(e) {
    this.#e.has(e.queryHash) || (this.#e.set(e.queryHash, e), this.notify({
      type: "added",
      query: e
    }));
  }
  remove(e) {
    const t = this.#e.get(e.queryHash);
    t && (e.destroy(), t === e && this.#e.delete(e.queryHash), this.notify({ type: "removed", query: e }));
  }
  clear() {
    A.batch(() => {
      this.getAll().forEach((e) => {
        this.remove(e);
      });
    });
  }
  get(e) {
    return this.#e.get(e);
  }
  getAll() {
    return [...this.#e.values()];
  }
  find(e) {
    const t = { exact: !0, ...e };
    return this.getAll().find(
      (i) => $t(t, i)
    );
  }
  findAll(e = {}) {
    const t = this.getAll();
    return Object.keys(e).length > 0 ? t.filter((i) => $t(e, i)) : t;
  }
  notify(e) {
    A.batch(() => {
      this.listeners.forEach((t) => {
        t(e);
      });
    });
  }
  onFocus() {
    A.batch(() => {
      this.getAll().forEach((e) => {
        e.onFocus();
      });
    });
  }
  onOnline() {
    A.batch(() => {
      this.getAll().forEach((e) => {
        e.onOnline();
      });
    });
  }
}, Ln = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  #s;
  constructor(e = {}) {
    this.#e = e.queryCache || new An(), this.#t = e.mutationCache || new Dn(), this.#i = e.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = Pt.subscribe(async (e) => {
      e && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = Ye.subscribe(async (e) => {
      e && (await this.resumePausedMutations(), this.#e.onOnline());
    }));
  }
  unmount() {
    this.#o--, this.#o === 0 && (this.#a?.(), this.#a = void 0, this.#s?.(), this.#s = void 0);
  }
  isFetching(e) {
    return this.#e.findAll({ ...e, fetchStatus: "fetching" }).length;
  }
  isMutating(e) {
    return this.#t.findAll({ ...e, status: "pending" }).length;
  }
  /**
   * Imperative (non-reactive) way to retrieve data for a QueryKey.
   * Should only be used in callbacks or functions where reading the latest data is necessary, e.g. for optimistic updates.
   *
   * Hint: Do not use this function inside a component, because it won't receive updates.
   * Use `useQuery` to create a `QueryObserver` that subscribes to changes.
   */
  getQueryData(e) {
    const t = this.defaultQueryOptions({ queryKey: e });
    return this.#e.get(t.queryHash)?.state.data;
  }
  ensureQueryData(e) {
    const t = this.defaultQueryOptions(e), i = this.#e.build(this, t), n = i.state.data;
    return n === void 0 ? this.fetchQuery(e) : (e.revalidateIfStale && i.isStaleByTime(oe(t.staleTime, i)) && this.prefetchQuery(t), Promise.resolve(n));
  }
  getQueriesData(e) {
    return this.#e.findAll(e).map(({ queryKey: t, state: i }) => {
      const n = i.data;
      return [t, n];
    });
  }
  setQueryData(e, t, i) {
    const n = this.defaultQueryOptions({ queryKey: e }), s = this.#e.get(
      n.queryHash
    )?.state.data, a = gn(t, s);
    if (a !== void 0)
      return this.#e.build(this, n).setData(a, { ...i, manual: !0 });
  }
  setQueriesData(e, t, i) {
    return A.batch(
      () => this.#e.findAll(e).map(({ queryKey: n }) => [
        n,
        this.setQueryData(n, t, i)
      ])
    );
  }
  getQueryState(e) {
    const t = this.defaultQueryOptions({ queryKey: e });
    return this.#e.get(
      t.queryHash
    )?.state;
  }
  removeQueries(e) {
    const t = this.#e;
    A.batch(() => {
      t.findAll(e).forEach((i) => {
        t.remove(i);
      });
    });
  }
  resetQueries(e, t) {
    const i = this.#e;
    return A.batch(() => (i.findAll(e).forEach((n) => {
      n.reset();
    }), this.refetchQueries(
      {
        type: "active",
        ...e
      },
      t
    )));
  }
  cancelQueries(e, t = {}) {
    const i = { revert: !0, ...t }, n = A.batch(
      () => this.#e.findAll(e).map((r) => r.cancel(i))
    );
    return Promise.all(n).then($).catch($);
  }
  invalidateQueries(e, t = {}) {
    return A.batch(() => (this.#e.findAll(e).forEach((i) => {
      i.invalidate();
    }), e?.refetchType === "none" ? Promise.resolve() : this.refetchQueries(
      {
        ...e,
        type: e?.refetchType ?? e?.type ?? "active"
      },
      t
    )));
  }
  refetchQueries(e, t = {}) {
    const i = {
      ...t,
      cancelRefetch: t.cancelRefetch ?? !0
    }, n = A.batch(
      () => this.#e.findAll(e).filter((r) => !r.isDisabled() && !r.isStatic()).map((r) => {
        let s = r.fetch(void 0, i);
        return i.throwOnError || (s = s.catch($)), r.state.fetchStatus === "paused" ? Promise.resolve() : s;
      })
    );
    return Promise.all(n).then($);
  }
  fetchQuery(e) {
    const t = this.defaultQueryOptions(e);
    t.retry === void 0 && (t.retry = !1);
    const i = this.#e.build(this, t);
    return i.isStaleByTime(
      oe(t.staleTime, i)
    ) ? i.fetch(t) : Promise.resolve(i.state.data);
  }
  prefetchQuery(e) {
    return this.fetchQuery(e).then($).catch($);
  }
  fetchInfiniteQuery(e) {
    return e.behavior = qt(e.pages), this.fetchQuery(e);
  }
  prefetchInfiniteQuery(e) {
    return this.fetchInfiniteQuery(e).then($).catch($);
  }
  ensureInfiniteQueryData(e) {
    return e.behavior = qt(e.pages), this.ensureQueryData(e);
  }
  resumePausedMutations() {
    return Ye.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
  setDefaultOptions(e) {
    this.#i = e;
  }
  setQueryDefaults(e, t) {
    this.#r.set(fe(e), {
      queryKey: e,
      defaultOptions: t
    });
  }
  getQueryDefaults(e) {
    const t = [...this.#r.values()], i = {};
    return t.forEach((n) => {
      Re(e, n.queryKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  setMutationDefaults(e, t) {
    this.#n.set(fe(e), {
      mutationKey: e,
      defaultOptions: t
    });
  }
  getMutationDefaults(e) {
    const t = [...this.#n.values()], i = {};
    return t.forEach((n) => {
      Re(e, n.mutationKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  defaultQueryOptions(e) {
    if (e._defaulted)
      return e;
    const t = {
      ...this.#i.queries,
      ...this.getQueryDefaults(e.queryKey),
      ...e,
      _defaulted: !0
    };
    return t.queryHash || (t.queryHash = Ct(
      t.queryKey,
      t
    )), t.refetchOnReconnect === void 0 && (t.refetchOnReconnect = t.networkMode !== "always"), t.throwOnError === void 0 && (t.throwOnError = !!t.suspense), !t.networkMode && t.persister && (t.networkMode = "offlineFirst"), t.queryFn === kt && (t.enabled = !1), t;
  }
  defaultMutationOptions(e) {
    return e?._defaulted ? e : {
      ...this.#i.mutations,
      ...e?.mutationKey && this.getMutationDefaults(e.mutationKey),
      ...e,
      _defaulted: !0
    };
  }
  clear() {
    this.#e.clear(), this.#t.clear();
  }
}, pe, R, rt, Yt, Xe = 0, Li = [], D = S, Xt = D.__b, Jt = D.__r, Zt = D.diffed, ei = D.__c, ti = D.unmount, ii = D.__;
function Oe(e, t) {
  D.__h && D.__h(R, e, Xe || t), Xe = 0;
  var i = R.__H || (R.__H = { __: [], __h: [] });
  return e >= i.__.length && i.__.push({}), i.__[e];
}
function x(e) {
  return Xe = 1, Hn(Hi, e);
}
function Hn(e, t, i) {
  var n = Oe(pe++, 2);
  if (n.t = e, !n.__c && (n.__ = [i ? i(t) : Hi(void 0, t), function(l) {
    var u = n.__N ? n.__N[0] : n.__[0], d = n.t(u, l);
    u !== d && (n.__N = [d, n.__[1]], n.__c.setState({}));
  }], n.__c = R, !R.__f)) {
    var r = function(l, u, d) {
      if (!n.__c.__H) return !0;
      var h = n.__c.__H.__.filter(function(p) {
        return !!p.__c;
      });
      if (h.every(function(p) {
        return !p.__N;
      })) return !s || s.call(this, l, u, d);
      var c = n.__c.props !== l;
      return h.forEach(function(p) {
        if (p.__N) {
          var m = p.__[0];
          p.__ = p.__N, p.__N = void 0, m !== p.__[0] && (c = !0);
        }
      }), s && s.call(this, l, u, d) || c;
    };
    R.__f = !0;
    var s = R.shouldComponentUpdate, a = R.componentWillUpdate;
    R.componentWillUpdate = function(l, u, d) {
      if (this.__e) {
        var h = s;
        s = void 0, r(l, u, d), s = h;
      }
      a && a.call(this, l, u, d);
    }, R.shouldComponentUpdate = r;
  }
  return n.__N || n.__;
}
function B(e, t) {
  var i = Oe(pe++, 3);
  !D.__s && Ft(i.__H, t) && (i.__ = e, i.u = t, R.__H.__h.push(i));
}
function zn(e, t) {
  var i = Oe(pe++, 4);
  !D.__s && Ft(i.__H, t) && (i.__ = e, i.u = t, R.__h.push(i));
}
function Un(e, t) {
  var i = Oe(pe++, 7);
  return Ft(i.__H, t) && (i.__ = e(), i.__H = t, i.__h = e), i.__;
}
function G(e, t) {
  return Xe = 8, Un(function() {
    return e;
  }, t);
}
function Rt(e) {
  var t = R.context[e.__c], i = Oe(pe++, 9);
  return i.c = e, t ? (i.__ == null && (i.__ = !0, t.sub(R)), t.props.value) : e.__;
}
function $n() {
  for (var e; e = Li.shift(); ) if (e.__P && e.__H) try {
    e.__H.__h.forEach(Qe), e.__H.__h.forEach(vt), e.__H.__h = [];
  } catch (t) {
    e.__H.__h = [], D.__e(t, e.__v);
  }
}
D.__b = function(e) {
  R = null, Xt && Xt(e);
}, D.__ = function(e, t) {
  e && t.__k && t.__k.__m && (e.__m = t.__k.__m), ii && ii(e, t);
}, D.__r = function(e) {
  Jt && Jt(e), pe = 0;
  var t = (R = e.__c).__H;
  t && (rt === R ? (t.__h = [], R.__h = [], t.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (t.__h.forEach(Qe), t.__h.forEach(vt), t.__h = [], pe = 0)), rt = R;
}, D.diffed = function(e) {
  Zt && Zt(e);
  var t = e.__c;
  t && t.__H && (t.__H.__h.length && (Li.push(t) !== 1 && Yt === D.requestAnimationFrame || ((Yt = D.requestAnimationFrame) || Bn)($n)), t.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), rt = R = null;
}, D.__c = function(e, t) {
  t.some(function(i) {
    try {
      i.__h.forEach(Qe), i.__h = i.__h.filter(function(n) {
        return !n.__ || vt(n);
      });
    } catch (n) {
      t.some(function(r) {
        r.__h && (r.__h = []);
      }), t = [], D.__e(n, i.__v);
    }
  }), ei && ei(e, t);
}, D.unmount = function(e) {
  ti && ti(e);
  var t, i = e.__c;
  i && i.__H && (i.__H.__.forEach(function(n) {
    try {
      Qe(n);
    } catch (r) {
      t = r;
    }
  }), i.__H = void 0, t && D.__e(t, i.__v));
};
var ni = typeof requestAnimationFrame == "function";
function Bn(e) {
  var t, i = function() {
    clearTimeout(n), ni && cancelAnimationFrame(t), setTimeout(e);
  }, n = setTimeout(i, 35);
  ni && (t = requestAnimationFrame(i));
}
function Qe(e) {
  var t = R, i = e.__c;
  typeof i == "function" && (e.__c = void 0, i()), R = t;
}
function vt(e) {
  var t = R;
  e.__c = e.__(), R = t;
}
function Ft(e, t) {
  return !e || e.length !== t.length || t.some(function(i, n) {
    return i !== e[n];
  });
}
function Hi(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function Nn(e, t) {
  for (var i in t) e[i] = t[i];
  return e;
}
function ri(e, t) {
  for (var i in e) if (i !== "__source" && !(i in t)) return !0;
  for (var n in t) if (n !== "__source" && e[n] !== t[n]) return !0;
  return !1;
}
function zi(e, t) {
  var i = t(), n = x({ t: { __: i, u: t } }), r = n[0].t, s = n[1];
  return zn(function() {
    r.__ = i, r.u = t, st(r) && s({ t: r });
  }, [e, i, t]), B(function() {
    return st(r) && s({ t: r }), e(function() {
      st(r) && s({ t: r });
    });
  }, [e]), i;
}
function st(e) {
  var t, i, n = e.u, r = e.__;
  try {
    var s = n();
    return !((t = r) === (i = s) && (t !== 0 || 1 / t == 1 / i) || t != t && i != i);
  } catch {
    return !0;
  }
}
function si(e, t) {
  this.props = e, this.context = t;
}
(si.prototype = new Z()).isPureReactComponent = !0, si.prototype.shouldComponentUpdate = function(e, t) {
  return ri(this.props, e) || ri(this.state, t);
};
var oi = S.__b;
S.__b = function(e) {
  e.type && e.type.__f && e.ref && (e.props.ref = e.ref, e.ref = null), oi && oi(e);
};
var Wn = S.__e;
S.__e = function(e, t, i, n) {
  if (e.then) {
    for (var r, s = t; s = s.__; ) if ((r = s.__c) && r.__c) return t.__e == null && (t.__e = i.__e, t.__k = i.__k), r.__c(e, t);
  }
  Wn(e, t, i, n);
};
var ai = S.unmount;
function Ui(e, t, i) {
  return e && (e.__c && e.__c.__H && (e.__c.__H.__.forEach(function(n) {
    typeof n.__c == "function" && n.__c();
  }), e.__c.__H = null), (e = Nn({}, e)).__c != null && (e.__c.__P === i && (e.__c.__P = t), e.__c.__e = !0, e.__c = null), e.__k = e.__k && e.__k.map(function(n) {
    return Ui(n, t, i);
  })), e;
}
function $i(e, t, i) {
  return e && i && (e.__v = null, e.__k = e.__k && e.__k.map(function(n) {
    return $i(n, t, i);
  }), e.__c && e.__c.__P === t && (e.__e && i.appendChild(e.__e), e.__c.__e = !0, e.__c.__P = i)), e;
}
function ot() {
  this.__u = 0, this.o = null, this.__b = null;
}
function Bi(e) {
  if (!e.__) return null;
  var t = e.__.__c;
  return t && t.__a && t.__a(e);
}
function ze() {
  this.i = null, this.l = null;
}
S.unmount = function(e) {
  var t = e.__c;
  t && (t.__z = !0), t && t.__R && t.__R(), t && 32 & e.__u && (e.type = null), ai && ai(e);
}, (ot.prototype = new Z()).__c = function(e, t) {
  var i = t.__c, n = this;
  n.o == null && (n.o = []), n.o.push(i);
  var r = Bi(n.__v), s = !1, a = function() {
    s || n.__z || (s = !0, i.__R = null, r ? r(u) : u());
  };
  i.__R = a;
  var l = i.__P;
  i.__P = null;
  var u = function() {
    if (!--n.__u) {
      if (n.state.__a) {
        var d = n.state.__a;
        n.__v.__k[0] = $i(d, d.__c.__P, d.__c.__O);
      }
      var h;
      for (n.setState({ __a: n.__b = null }); h = n.o.pop(); ) h.__P = l, h.forceUpdate();
    }
  };
  n.__u++ || 32 & t.__u || n.setState({ __a: n.__b = n.__v.__k[0] }), e.then(a, a);
}, ot.prototype.componentWillUnmount = function() {
  this.o = [];
}, ot.prototype.render = function(e, t) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), n = this.__v.__k[0].__c;
      this.__v.__k[0] = Ui(this.__b, i, n.__O = n.__P);
    }
    this.__b = null;
  }
  var r = t.__a && dt(q, null, e.fallback);
  return r && (r.__u &= -33), [dt(q, null, t.__a ? null : e.children), r];
};
var li = function(e, t, i) {
  if (++i[1] === i[0] && e.l.delete(t), e.props.revealOrder && (e.props.revealOrder[0] !== "t" || !e.l.size)) for (i = e.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    e.i = i = i[2];
  }
};
(ze.prototype = new Z()).__a = function(e) {
  var t = this, i = Bi(t.__v), n = t.l.get(e);
  return n[0]++, function(r) {
    var s = function() {
      t.props.revealOrder ? (n.push(r), li(t, e, n)) : r();
    };
    i ? i(s) : s();
  };
}, ze.prototype.render = function(e) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var t = qe(e.children);
  e.revealOrder && e.revealOrder[0] === "b" && t.reverse();
  for (var i = t.length; i--; ) this.l.set(t[i], this.i = [1, 0, this.i]);
  return e.children;
}, ze.prototype.componentDidUpdate = ze.prototype.componentDidMount = function() {
  var e = this;
  this.l.forEach(function(t, i) {
    li(e, i, t);
  });
};
var Qn = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, jn = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, Gn = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, Kn = /[A-Z0-9]/g, qn = typeof document < "u", Vn = function(e) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(e);
};
Z.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(e) {
  Object.defineProperty(Z.prototype, e, { configurable: !0, get: function() {
    return this["UNSAFE_" + e];
  }, set: function(t) {
    Object.defineProperty(this, e, { configurable: !0, writable: !0, value: t });
  } });
});
var ci = S.event;
function Yn() {
}
function Xn() {
  return this.cancelBubble;
}
function Jn() {
  return this.defaultPrevented;
}
S.event = function(e) {
  return ci && (e = ci(e)), e.persist = Yn, e.isPropagationStopped = Xn, e.isDefaultPrevented = Jn, e.nativeEvent = e;
};
var Zn = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, di = S.vnode;
S.vnode = function(e) {
  typeof e.type == "string" && (function(t) {
    var i = t.props, n = t.type, r = {}, s = n.indexOf("-") === -1;
    for (var a in i) {
      var l = i[a];
      if (!(a === "value" && "defaultValue" in i && l == null || qn && a === "children" && n === "noscript" || a === "class" || a === "className")) {
        var u = a.toLowerCase();
        a === "defaultValue" && "value" in i && i.value == null ? a = "value" : a === "download" && l === !0 ? l = "" : u === "translate" && l === "no" ? l = !1 : u[0] === "o" && u[1] === "n" ? u === "ondoubleclick" ? a = "ondblclick" : u !== "onchange" || n !== "input" && n !== "textarea" || Vn(i.type) ? u === "onfocus" ? a = "onfocusin" : u === "onblur" ? a = "onfocusout" : Gn.test(a) && (a = u) : u = a = "oninput" : s && jn.test(a) ? a = a.replace(Kn, "-$&").toLowerCase() : l === null && (l = void 0), u === "oninput" && r[a = u] && (a = "oninputCapture"), r[a] = l;
      }
    }
    n == "select" && r.multiple && Array.isArray(r.value) && (r.value = qe(i.children).forEach(function(d) {
      d.props.selected = r.value.indexOf(d.props.value) != -1;
    })), n == "select" && r.defaultValue != null && (r.value = qe(i.children).forEach(function(d) {
      d.props.selected = r.multiple ? r.defaultValue.indexOf(d.props.value) != -1 : r.defaultValue == d.props.value;
    })), i.class && !i.className ? (r.class = i.class, Object.defineProperty(r, "className", Zn)) : (i.className && !i.class || i.class && i.className) && (r.class = r.className = i.className), t.props = r;
  })(e), e.$$typeof = Qn, di && di(e);
};
var ui = S.__r;
S.__r = function(e) {
  ui && ui(e), e.__c;
};
var hi = S.diffed;
S.diffed = function(e) {
  hi && hi(e);
  var t = e.props, i = e.__e;
  i != null && e.type === "textarea" && "value" in t && t.value !== i.value && (i.value = t.value == null ? "" : t.value);
};
var Ni = Et(
  void 0
), Ze = (e) => {
  const t = Rt(Ni);
  if (!t)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return t;
}, er = ({
  client: e,
  children: t
}) => (B(() => (e.mount(), () => {
  e.unmount();
}), [e]), /* @__PURE__ */ o(Ni.Provider, { value: e, children: t })), Wi = Et(!1), tr = () => Rt(Wi);
Wi.Provider;
function ir() {
  let e = !1;
  return {
    clearReset: () => {
      e = !1;
    },
    reset: () => {
      e = !0;
    },
    isReset: () => e
  };
}
var nr = Et(ir()), rr = () => Rt(nr), sr = (e, t, i) => {
  const n = i?.state.error && typeof e.throwOnError == "function" ? Tt(e.throwOnError, [i.state.error, i]) : e.throwOnError;
  (e.suspense || e.experimental_prefetchInRender || n) && (t.isReset() || (e.retryOnMount = !1));
}, or = (e) => {
  B(() => {
    e.clearReset();
  }, [e]);
}, ar = ({
  result: e,
  errorResetBoundary: t,
  throwOnError: i,
  query: n,
  suspense: r
}) => e.isError && !t.isReset() && !e.isFetching && n && (r && e.data === void 0 || Tt(i, [e.error, n])), lr = (e) => {
  if (e.suspense) {
    const i = (r) => r === "static" ? r : Math.max(r ?? 1e3, 1e3), n = e.staleTime;
    e.staleTime = typeof n == "function" ? (...r) => i(n(...r)) : i(n), typeof e.gcTime == "number" && (e.gcTime = Math.max(
      e.gcTime,
      1e3
    ));
  }
}, cr = (e, t) => e.isLoading && e.isFetching && !t, dr = (e, t) => e?.suspense && t.isPending, fi = (e, t, i) => t.fetchOptimistic(e).catch(() => {
  i.clearReset();
});
function ur(e, t, i) {
  const n = tr(), r = rr(), s = Ze(), a = s.defaultQueryOptions(e);
  s.getDefaultOptions().queries?._experimental_beforeQuery?.(
    a
  );
  const l = s.getQueryCache().get(a.queryHash);
  a._optimisticResults = n ? "isRestoring" : "optimistic", lr(a), sr(a, r, l), or(r);
  const u = !s.getQueryCache().get(a.queryHash), [d] = x(
    () => new t(
      s,
      a
    )
  ), h = d.getOptimisticResult(a), c = !n && e.subscribed !== !1;
  if (zi(
    G(
      (p) => {
        const m = c ? d.subscribe(A.batchCalls(p)) : $;
        return d.updateResult(), m;
      },
      [d, c]
    ),
    () => d.getCurrentResult()
  ), B(() => {
    d.setOptions(a);
  }, [a, d]), dr(a, h))
    throw fi(a, d, r);
  if (ar({
    result: h,
    errorResetBoundary: r,
    throwOnError: a.throwOnError,
    query: l,
    suspense: a.suspense
  }))
    throw h.error;
  return s.getDefaultOptions().queries?._experimental_afterQuery?.(
    a,
    h
  ), a.experimental_prefetchInRender && !he && cr(h, n) && (u ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    fi(a, d, r)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    l?.promise
  ))?.catch($).finally(() => {
    d.updateResult();
  }), a.notifyOnChangeProps ? h : d.trackResult(h);
}
function Ot(e, t) {
  return ur(e, Pn);
}
function Se(e, t) {
  const i = Ze(), [n] = x(
    () => new Mn(
      i,
      e
    )
  );
  B(() => {
    n.setOptions(e);
  }, [n, e]);
  const r = zi(
    G(
      (a) => n.subscribe(A.batchCalls(a)),
      [n]
    ),
    () => n.getCurrentResult()
  ), s = G(
    (a, l) => {
      n.mutate(a, l).catch($);
    },
    [n]
  );
  if (r.error && Tt(n.options.throwOnError, [r.error]))
    throw r.error;
  return { ...r, mutate: s, mutateAsync: r.mutate };
}
const K = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif", f = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "100%",
    minHeight: "100%",
    fontFamily: K
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
    fontFamily: K
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
    fontFamily: K
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
    fontFamily: K
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: K
  },
  placementGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "0.5rem"
  },
  placementBtn: (e) => ({
    padding: "0.75rem 1rem",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    ...e ? { background: "#3b82f6", color: "#fff", border: "none" } : { background: "#fff", color: "#475569", border: "1px solid #e2e8f0" }
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
  tab: (e) => ({
    padding: "1rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: e ? 600 : 500,
    color: e ? "#2563eb" : "#64748b",
    cursor: "pointer",
    position: "relative",
    background: "none",
    border: "none",
    fontFamily: K,
    borderBottom: e ? "2px solid #3b82f6" : "2px solid transparent"
  }),
  heatmapRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 0",
    borderTop: "1px solid rgba(226,232,240,0.8)",
    marginTop: "1.5rem"
  },
  toggle: (e) => ({
    position: "relative",
    width: "3rem",
    height: "1.75rem",
    borderRadius: "9999px",
    cursor: "pointer",
    transition: "all 0.2s",
    background: e ? "#10b981" : "#cbd5e1",
    border: "none"
  }),
  toggleThumb: (e) => ({
    position: "absolute",
    top: "0.25rem",
    left: e ? "1.5rem" : "0.25rem",
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
    fontFamily: K
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
    fontFamily: K
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
}, hr = `
* { font-family: ${K}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function T({
  variant: e,
  children: t,
  onClick: i,
  type: n = "button",
  title: r,
  active: s = !1,
  style: a,
  class: l,
  disabled: u,
  "aria-label": d
}) {
  const h = e === "primary" ? f.primaryBtn : e === "secondary" ? f.secondaryBtn : e === "icon" ? f.iconBtn : e === "iconSm" ? f.iconBtnSm : e === "placement" ? f.placementBtn(s) : {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.25rem",
    fontFamily: K
  }, c = a ? { ...h, ...a } : h;
  return /* @__PURE__ */ o(
    "button",
    {
      type: n,
      style: c,
      class: l,
      onClick: i,
      title: r,
      disabled: u,
      "aria-label": d,
      children: t
    }
  );
}
function Pe({
  type: e = "text",
  value: t,
  onInput: i,
  placeholder: n,
  id: r,
  style: s,
  disabled: a,
  "aria-label": l
}) {
  const u = s ? { ...f.input, ...s } : f.input;
  return /* @__PURE__ */ o(
    "input",
    {
      type: e,
      value: t,
      onInput: i,
      placeholder: n,
      id: r,
      style: u,
      disabled: a,
      "aria-label": l
    }
  );
}
function Dt({
  value: e,
  onInput: t,
  placeholder: i,
  id: n,
  minHeight: r,
  style: s,
  disabled: a,
  "aria-label": l
}) {
  const u = s ? { ...f.textarea, ...s, ...r != null && { minHeight: typeof r == "number" ? `${r}px` : r } } : r != null ? { ...f.textarea, minHeight: typeof r == "number" ? `${r}px` : r } : f.textarea;
  return /* @__PURE__ */ o(
    "textarea",
    {
      value: e,
      onInput: t,
      placeholder: i,
      id: n,
      style: u,
      disabled: a,
      "aria-label": l
    }
  );
}
const fr = ["top", "right", "bottom", "left"];
function pr({ onMessage: e, elementSelected: t }) {
  const [i, n] = x(""), [r, s] = x(null), [a, l] = x(""), [u, d] = x("right"), [h, c] = x(""), [p, m] = x(!1);
  B(() => {
    e({ type: "EDITOR_READY" });
  }, []), B(() => {
    t ? (n(t.selector), s(t.elementInfo), m(!0), l(""), c("")) : (n(""), s(null), m(!1), l(""), c(""));
  }, [t]);
  const v = () => {
    const g = a.trim();
    if (!g) {
      c("Please enter guide content");
      return;
    }
    if (!i) {
      c("No element selected");
      return;
    }
    c(""), e({
      type: "SAVE_GUIDE",
      guide: {
        page: Ge(),
        selector: i,
        content: g,
        placement: u,
        status: "active"
      }
    });
  }, b = () => {
    n(""), s(null), m(!1), l(""), c(""), e({ type: "CLEAR_SELECTION_CLICKED" });
  }, w = (g) => {
    const _ = [];
    return g.tagName && _.push(`Tag: ${g.tagName}`), g.id && _.push(`ID: ${g.id}`), g.className && _.push(`Class: ${g.className}`), g.textContent && _.push(`Text: ${g.textContent}`), _.join(" | ");
  };
  return /* @__PURE__ */ o("div", { style: f.root, children: [
    /* @__PURE__ */ o("div", { style: f.header, children: [
      /* @__PURE__ */ o("h2", { style: f.headerTitle, children: "Create Guide" }),
      /* @__PURE__ */ o(T, { variant: "icon", onClick: () => e({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    p ? /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ o("div", { style: f.section, children: [
        /* @__PURE__ */ o("label", { style: f.label, children: "Selector" }),
        /* @__PURE__ */ o("div", { style: f.selectorBox, children: i || "-" })
      ] }),
      r && /* @__PURE__ */ o("div", { style: f.elementInfo, children: [
        /* @__PURE__ */ o("strong", { style: f.elementInfoTitle, children: "Element Info" }),
        /* @__PURE__ */ o("div", { style: f.elementInfoText, children: w(r) })
      ] }),
      /* @__PURE__ */ o("div", { style: f.section, children: [
        /* @__PURE__ */ o("label", { for: "guideContent", style: f.label, children: "Guide Content" }),
        /* @__PURE__ */ o(
          Dt,
          {
            id: "guideContent",
            placeholder: "Enter the guide text that will be shown to users...",
            value: a,
            onInput: (g) => l(g.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ o("div", { style: f.section, children: [
        /* @__PURE__ */ o("label", { style: f.label, children: "Placement" }),
        /* @__PURE__ */ o("div", { style: f.placementGrid, children: fr.map((g) => /* @__PURE__ */ o(
          T,
          {
            variant: "placement",
            active: u === g,
            onClick: () => d(g),
            children: g.charAt(0).toUpperCase() + g.slice(1)
          },
          g
        )) })
      ] }),
      h && /* @__PURE__ */ o("div", { style: f.errorBox, children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:alert-circle" }),
        h
      ] }),
      /* @__PURE__ */ o("div", { style: f.actionRow, children: [
        /* @__PURE__ */ o(T, { variant: "secondary", onClick: () => e({ type: "CANCEL" }), children: "Cancel" }),
        /* @__PURE__ */ o(T, { variant: "secondary", onClick: b, children: "Clear Selection" }),
        /* @__PURE__ */ o(T, { variant: "primary", style: { flex: 1 }, onClick: v, children: "Save Guide" })
      ] })
    ] }) : /* @__PURE__ */ o("div", { style: f.emptyState, children: [
      /* @__PURE__ */ o("div", { style: f.emptyStateIcon, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:cursor-default-click", style: { fontSize: "1.875rem", color: "#3b82f6" } }) }),
      /* @__PURE__ */ o("p", { style: f.emptyStateText, children: "Click on an element in the page to create a guide" }),
      /* @__PURE__ */ o(T, { variant: "primary", onClick: () => e({ type: "ACTIVATE_SELECTOR" }), children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:selection-marker" }),
        "Select element"
      ] })
    ] })
  ] });
}
const mr = "https://devgw.revgain.ai/rg-pex", Qi = "designerIud";
function gr() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(Qi);
  } catch {
    return null;
  }
}
function Ue(e) {
  const t = {
    "Content-Type": "application/json",
    ...e
  }, i = gr();
  return i && (t.iud = i), t;
}
const V = {
  baseUrl: mr,
  async get(e, t) {
    const i = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, n = await fetch(i, {
      ...t,
      headers: { ...Ue(), ...t?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  },
  async post(e, t, i) {
    const n = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, r = await fetch(n, {
      method: "POST",
      ...i,
      headers: { ...Ue(), ...i?.headers },
      body: t !== void 0 ? JSON.stringify(t) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async put(e, t, i) {
    const n = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, r = await fetch(n, {
      method: "PUT",
      ...i,
      headers: { ...Ue(), ...i?.headers },
      body: t !== void 0 ? JSON.stringify(t) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async delete(e, t) {
    const i = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, n = await fetch(i, {
      method: "DELETE",
      ...t,
      headers: { ...Ue(), ...t?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  }
}, yr = ["pages", "create"];
async function _r(e) {
  return V.post("/pages", {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: "active"
  });
}
function vr() {
  return Se({
    mutationKey: yr,
    mutationFn: _r
  });
}
const br = ["pages", "update"];
async function wr({ pageId: e, payload: t }) {
  return V.put(`/pages/${e}`, {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: t.status ?? "active"
  });
}
function Sr() {
  return Se({
    mutationKey: br,
    mutationFn: wr
  });
}
const xr = ["pages", "delete"];
async function Er(e) {
  return V.delete(`/pages/${e}`);
}
function Cr() {
  return Se({
    mutationKey: xr,
    mutationFn: Er
  });
}
const kr = (e) => ["pages", "check-slug", e];
async function Tr(e) {
  return V.get(`/pages/check-slug?slug=${encodeURIComponent(e)}`);
}
function Pr(e) {
  return Ot({
    queryKey: kr(e),
    queryFn: () => Tr(e),
    enabled: !!e,
    retry: 0
  });
}
const Ir = ["pages", "list"];
async function Rr() {
  return V.get("/pages");
}
function Fr() {
  return Ot({
    queryKey: Ir,
    queryFn: Rr,
    retry: 0
  });
}
const Or = "designerTaggedPages", $e = ["pages", "check-slug"], at = ["pages", "list"];
function Be() {
  try {
    const t = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (t.host || t.hostname || "") + (t.pathname || "/") + (t.search || "") + (t.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function Ne() {
  try {
    const t = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (t.pathname || "/").replace(/^\//, ""), n = t.search || "", r = t.hash || "";
    return "//*/" + i + n + r;
  } catch {
    return "//*/";
  }
}
function Dr({ onMessage: e }) {
  const [t, i] = x("overviewUntagged"), [n, r] = x(""), [s, a] = x(""), [l, u] = x(""), [d, h] = x(!1), [c, p] = x("create"), [m, v] = x(""), [b, w] = x(""), [g, _] = x("suggested"), [I, F] = x(""), [z, L] = x(!1), [O, k] = x(null), [M, N] = x(!1), P = Ze(), H = vr(), Q = Sr(), xe = Cr(), { data: ee, isLoading: et, isError: Ee } = Pr(n), { data: Ce, isLoading: le } = Fr(), Y = !!n && et, me = H.isPending || Q.isPending, De = (n || "").trim().toLowerCase(), ge = (Ce?.data ?? []).filter((E) => (E.slug || "").trim().toLowerCase() === De).filter(
    (E) => (E.name || "").toLowerCase().includes(l.toLowerCase().trim())
  ), te = G(() => {
    i("overviewUntagged"), a(Be() || "(current page)"), h(!1), P.invalidateQueries({ queryKey: $e });
  }, [P]), Me = G(() => {
    i("taggedPagesDetailView"), u("");
  }, []), ye = G(() => {
    k(null), i("tagPageFormView"), h(!0), F(Ne()), v(""), w(""), p("create"), _("suggested"), L(!1);
  }, []), it = G((E) => {
    k(E.page_id), i("tagPageFormView"), h(!0), F(E.slug || Ne()), v(E.name || ""), w(E.description || ""), p("create"), _("suggested"), L(!1);
  }, []);
  B(() => {
    e({ type: "EDITOR_READY" });
  }, []), B(() => {
    r(Ne()), a(Be() || "(current page)");
  }, []), B(() => {
    if (!n) {
      i("overviewUntagged");
      return;
    }
    if (Ee) {
      (t === "overviewTagged" || t === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    ee !== void 0 && (t === "overviewTagged" || t === "overviewUntagged") && i(ee.exists ? "overviewTagged" : "overviewUntagged");
  }, [n, ee, Ee, t]), B(() => {
    let E = Be();
    const ie = () => {
      const re = Be();
      re !== E && (E = re, r(Ne()), a(re || "(current page)"), i("overviewUntagged"));
    }, ne = () => ie(), _e = () => ie();
    window.addEventListener("hashchange", ne), window.addEventListener("popstate", _e);
    const ke = setInterval(ie, 1500);
    return () => {
      window.removeEventListener("hashchange", ne), window.removeEventListener("popstate", _e), clearInterval(ke);
    };
  }, []);
  const Ae = async () => {
    const E = m.trim();
    if (!E) {
      L(!0);
      return;
    }
    L(!1);
    const ie = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, ne = I.trim() || ie || "/";
    try {
      if (O)
        await Q.mutateAsync({
          pageId: O,
          payload: {
            name: E,
            slug: ne,
            description: b.trim() || void 0,
            status: "active"
          }
        }), k(null), P.invalidateQueries({ queryKey: $e }), P.invalidateQueries({ queryKey: at }), te();
      else {
        const _e = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, ke = I.trim() || _e;
        await H.mutateAsync({
          name: E,
          slug: ne,
          description: b.trim() || void 0
        });
        const re = Or, nt = localStorage.getItem(re) || "[]", y = JSON.parse(nt);
        y.push({ pageName: E, url: ke }), localStorage.setItem(re, JSON.stringify(y)), P.invalidateQueries({ queryKey: $e }), P.invalidateQueries({ queryKey: at }), i("overviewTagged"), h(!1);
      }
    } catch {
    }
  }, X = async (E) => {
    if (window.confirm("Delete this page?"))
      try {
        await xe.mutateAsync(E), P.invalidateQueries({ queryKey: $e }), P.invalidateQueries({ queryKey: at });
      } catch {
      }
  }, ce = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return M ? /* @__PURE__ */ o("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(T, { variant: "icon", title: "Expand", onClick: () => N(!1), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ o("div", { style: f.panel, children: [
    /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(T, { variant: "icon", title: "Minimize", onClick: () => N(!0), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ o("div", { style: f.panelBody, children: [
      Y && (t === "overviewTagged" || t === "overviewUntagged") && /* @__PURE__ */ o("div", { style: { ...ce, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ o("span", { children: "Checking page…" })
      ] }),
      !Y && t === "overviewTagged" && /* @__PURE__ */ o("div", { style: ce, children: [
        /* @__PURE__ */ o("div", { style: f.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ o("div", { style: { ...f.card, marginBottom: "1rem", cursor: "pointer" }, onClick: Me, children: /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ o("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ o("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ o("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ o("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: s })
            ] })
          ] }),
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ o(T, { variant: "primary", style: { width: "100%" }, onClick: ye, children: "Tag Page" })
      ] }),
      t === "taggedPagesDetailView" && /* @__PURE__ */ o("div", { style: ce, children: [
        /* @__PURE__ */ o(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (E) => {
              E.preventDefault(), te();
            },
            children: [
              /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: le ? "…" : ge.length }),
          /* @__PURE__ */ o("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ o("div", { style: f.searchWrap, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
          /* @__PURE__ */ o(
            Pe,
            {
              type: "text",
              placeholder: "Search Pages",
              value: l,
              onInput: (E) => u(E.target.value),
              style: f.searchInput
            }
          ),
          l && /* @__PURE__ */ o(T, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => u(""), children: "Clear" })
        ] }),
        le ? /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ o("span", { children: "Loading pages…" })
        ] }) : ge.map((E) => /* @__PURE__ */ o("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: E.name || "Unnamed" }),
          /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ o(T, { variant: "iconSm", title: "Edit", onClick: () => it(E), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ o(T, { variant: "iconSm", title: "Delete", onClick: () => X(E.page_id), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, E.page_id)),
        /* @__PURE__ */ o(T, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: ye, children: "Tag Page" })
      ] }),
      !Y && t === "overviewUntagged" && /* @__PURE__ */ o("div", { style: { ...ce, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ o("div", { style: { ...f.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ o("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ o(T, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: ye, children: "Tag Page" })
      ] }),
      t === "tagPageFormView" && /* @__PURE__ */ o("div", { style: { ...ce, gap: "1.5rem" }, children: [
        /* @__PURE__ */ o(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (E) => {
              E.preventDefault(), k(null), te(), h(!1);
            },
            children: [
              /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back"
            ]
          }
        ),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ o("div", { style: f.sectionLabel, children: O ? "EDIT PAGE" : "PAGE SETUP" }),
          !O && /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "pageSetup", value: "create", checked: c === "create", onChange: () => p("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create New Page" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "pageSetup", value: "merge", checked: c === "merge", onChange: () => p("merge"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Merge with Existing" })
            ] })
          ] }),
          /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }, children: [
            /* @__PURE__ */ o("div", { children: [
              /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: [
                "Page Name ",
                /* @__PURE__ */ o("span", { style: { color: "#ef4444" }, children: "*" })
              ] }),
              /* @__PURE__ */ o(
                Pe,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: m,
                  onInput: (E) => v(E.target.value)
                }
              ),
              z && /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ o("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ o("div", { children: [
              /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ o(
                Dt,
                {
                  placeholder: "Click to add description",
                  value: b,
                  onInput: (E) => w(E.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ o("div", { style: { ...f.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "INCLUDE PAGE RULES",
            /* @__PURE__ */ o("span", { style: { color: "#94a3b8" }, title: "Define how this page is identified", children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ o("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }, children: [
            /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#334155" }, children: "Include Rule 1" }),
            /* @__PURE__ */ o(T, { variant: "iconSm", children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "ruleType", value: "suggested", checked: g === "suggested", onChange: () => _("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "ruleType", value: "exact", checked: g === "exact", onChange: () => _("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "ruleType", value: "builder", checked: g === "builder", onChange: () => _("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ o("div", { children: [
            /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ o(Pe, { type: "text", placeholder: "e.g. //*/path/to/page", value: I, onInput: (E) => F(E.target.value) })
          ] })
        ] })
      ] })
    ] }),
    d && /* @__PURE__ */ o("div", { style: f.footer, children: [
      /* @__PURE__ */ o(
        T,
        {
          variant: "secondary",
          onClick: () => {
            k(null), te();
          },
          disabled: me,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ o(T, { variant: "primary", style: { flex: 1 }, onClick: Ae, disabled: me, children: me ? /* @__PURE__ */ o(q, { children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        O ? "Updating…" : "Saving…"
      ] }) : O ? "Update" : "Save" })
    ] })
  ] });
}
const Mr = ["features", "create"];
async function Ar(e) {
  return V.post("/features", e);
}
function Lr() {
  return Se({
    mutationKey: Mr,
    mutationFn: Ar
  });
}
const Hr = ["features", "update"];
async function zr({
  featureId: e,
  payload: t
}) {
  return V.put(`/features/${e}`, t);
}
function Ur() {
  return Se({
    mutationKey: Hr,
    mutationFn: zr
  });
}
const $r = ["features", "delete"];
async function Br(e) {
  return V.delete(`/features/${e}`);
}
function Nr() {
  return Se({
    mutationKey: $r,
    mutationFn: Br
  });
}
const Te = ["features", "list"];
async function Wr() {
  const e = await V.get("/features");
  return Array.isArray(e) ? { data: e } : e;
}
function Qr() {
  return Ot({
    queryKey: Te,
    queryFn: Wr,
    retry: 0
  });
}
const pi = "designerHeatmapEnabled";
function jr({ onMessage: e, elementSelected: t }) {
  const [i, n] = x("overview"), [r, s] = x(!1), [a, l] = x(""), [u, d] = x(null), [h, c] = x(""), [p, m] = x(!1), [v, b] = x(!1), [w, g] = x(!1), [_, I] = x(!1), [F, z] = x(!1), [L, O] = x("create"), [k, M] = x("suggested"), [N, P] = x(""), [H, Q] = x(""), [xe, ee] = x(null), [et, Ee] = x(null), [Ce, le] = x(""), Y = Ze(), me = Lr(), De = Ur(), tt = Nr(), { data: ge, isLoading: te } = Qr(), Me = me.isPending || De.isPending || tt.isPending, ye = ge?.data ?? [], it = ye.length, Ae = ye.filter((y) => (y.name || "").toLowerCase().includes(Ce.toLowerCase().trim())).sort((y, W) => (y.name || "").localeCompare(W.name || "", void 0, { sensitivity: "base" })), X = G(() => {
    n("overview"), s(!1), l(""), d(null), Q(""), c(""), m(!1), ee(null), le(""), Y.invalidateQueries({ queryKey: Te });
  }, [Y]), ce = G(() => {
    n("taggedList"), le("");
  }, []), E = G((y) => y.rules?.find(
    (se) => se.selector_type === "xpath" && (se.selector_value ?? "").trim() !== ""
  )?.selector_value ?? "", []), ie = G(
    (y) => {
      n("form"), s(!0), y ? (ee(y.feature_id), c(y.name || ""), P(y.description || ""), Q(E(y)), M("exact")) : (ee(null), c(""), P(""), Q(t?.xpath || ""), l(t?.selector || ""), d(t?.elementInfo || null)), m(!1);
    },
    [t, E]
  );
  B(() => {
    e({ type: "EDITOR_READY" });
  }, []), B(() => {
    e({ type: "FEATURES_FOR_HEATMAP", features: ge?.data ?? [] });
  }, [ge, e]), B(() => {
    const y = localStorage.getItem(pi) === "true";
    b(y);
  }, []), B(() => {
    t ? (l(t.selector), d(t.elementInfo), Q(t.xpath || ""), s(!0), n("form"), c(""), m(!1), O("create"), P(""), M("exact")) : X();
  }, [t]);
  const ne = () => {
    const y = !v;
    b(y);
    try {
      localStorage.setItem(pi, String(y));
    } catch {
    }
    e({ type: "HEATMAP_TOGGLE", enabled: y });
  }, _e = (y) => y.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""), ke = async () => {
    const y = h.trim();
    if (!y) {
      m(!0);
      return;
    }
    m(!1);
    const W = H || t?.xpath || "";
    if (k === "exact") {
      if (!W) return;
      const se = {
        name: y,
        slug: _e(y),
        description: N.trim() || "",
        status: "active",
        rules: [
          {
            selector_type: "xpath",
            selector_value: W,
            match_mode: "exact",
            priority: 10,
            is_active: !0
          }
        ]
      };
      try {
        xe ? (await De.mutateAsync({ featureId: xe, payload: se }), Y.invalidateQueries({ queryKey: Te }), X()) : (await me.mutateAsync(se), Y.invalidateQueries({ queryKey: Te }), X());
      } catch {
      }
      return;
    }
  }, re = async (y) => {
    if (window.confirm("Delete this feature?")) {
      Ee(y);
      try {
        await tt.mutateAsync(y), Y.invalidateQueries({ queryKey: Te }), xe === y && (ee(null), X());
      } catch {
      } finally {
        Ee(null);
      }
    }
  }, nt = (y) => {
    const W = [];
    y.tagName && W.push(`Tag: ${y.tagName}`), y.id && W.push(`ID: ${y.id}`), y.className && W.push(`Class: ${y.className}`);
    const se = (y.textContent || "").slice(0, 80);
    return se && W.push(`Text: ${se}`), W.join(" | ");
  };
  return w ? /* @__PURE__ */ o("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: r ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(T, { variant: "icon", title: "Expand", onClick: () => g(!1), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ o("div", { style: f.panel, children: [
    /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(T, { variant: "icon", title: "Minimize", onClick: () => g(!0), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ o("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: r ? /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ o("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ o("a", { href: "#", style: f.link, onClick: (y) => {
          y.preventDefault(), X();
        }, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ o("div", { style: f.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureSetup", checked: L === "create", onChange: () => O("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureSetup", checked: L === "merge", onChange: () => O("merge"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Merge with existing" })
            ] })
          ] }),
          /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }, children: [
            /* @__PURE__ */ o("div", { children: [
              /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: [
                "Feature name ",
                /* @__PURE__ */ o("span", { style: { color: "#ef4444" }, children: "*" })
              ] }),
              /* @__PURE__ */ o(
                Pe,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: h,
                  onInput: (y) => c(y.target.value)
                }
              ),
              p && /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ o("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a feature name."
              ] })
            ] }),
            /* @__PURE__ */ o("div", { children: [
              /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ o(
                Dt,
                {
                  placeholder: "Describe your Feature",
                  value: N,
                  onInput: (y) => P(y.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ o("div", { style: { ...f.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "FEATURE ELEMENT MATCHING",
            /* @__PURE__ */ o("span", { style: { color: "#94a3b8" }, title: "Match the element for this feature", children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureMatch", checked: k === "suggested", onChange: () => M("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureMatch", checked: k === "ruleBuilder", onChange: () => M("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureMatch", checked: k === "customCss", onChange: () => M("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureMatch", checked: k === "exact", onChange: () => M("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ o("div", { children: [
            /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: k === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ o("div", { style: f.selectorBox, children: k === "exact" ? (t?.xpath ?? H) || "-" : (t?.selector ?? a) || "-" })
          ] }),
          u && /* @__PURE__ */ o("div", { style: { marginTop: "1rem" }, children: [
            /* @__PURE__ */ o(
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
                onClick: () => z((y) => !y),
                "aria-expanded": F,
                children: [
                  /* @__PURE__ */ o("label", { style: { ...f.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                  /* @__PURE__ */ o(
                    "iconify-icon",
                    {
                      icon: F ? "mdi:chevron-up" : "mdi:chevron-down",
                      style: { fontSize: "1.125rem", color: "#64748b", flexShrink: 0 }
                    }
                  )
                ]
              }
            ),
            F && /* @__PURE__ */ o("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ o("div", { style: f.elementInfoText, children: nt(u) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ o("div", { style: f.footer, children: [
        /* @__PURE__ */ o(T, { variant: "secondary", onClick: X, children: "Cancel" }),
        /* @__PURE__ */ o(T, { variant: "primary", style: { flex: 1 }, onClick: ke, disabled: Me, children: Me ? "Saving..." : "Save" })
      ] })
    ] }) : /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i === "taggedList" ? /* @__PURE__ */ o(q, { children: [
      /* @__PURE__ */ o(
        "a",
        {
          href: "#",
          style: f.link,
          onClick: (y) => {
            y.preventDefault(), X();
          },
          children: [
            /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
            " Back to overview"
          ]
        }
      ),
      /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: te ? "…" : Ae.length }),
        /* @__PURE__ */ o("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Tagged Features" })
      ] }),
      /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged features" }),
      /* @__PURE__ */ o("div", { style: f.searchWrap, children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
        /* @__PURE__ */ o(
          Pe,
          {
            type: "text",
            placeholder: "Search features",
            value: Ce,
            onInput: (y) => le(y.target.value),
            style: f.searchInput
          }
        ),
        Ce && /* @__PURE__ */ o(T, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => le(""), children: "Clear" })
      ] }),
      te ? /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
        /* @__PURE__ */ o("span", { children: "Loading features…" })
      ] }) : Ae.map((y) => {
        const W = et === y.feature_id;
        return /* @__PURE__ */ o("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: y.name || "Unnamed" }),
          /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem", alignItems: "center" }, children: [
            /* @__PURE__ */ o(T, { variant: "iconSm", title: "Edit", onClick: () => ie(y), disabled: W, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:pencil" }) }),
            W ? /* @__PURE__ */ o("span", { style: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", color: "#64748b" } }) }) : /* @__PURE__ */ o(T, { variant: "iconSm", title: "Delete", onClick: () => re(y.feature_id), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, y.feature_id);
      }),
      /* @__PURE__ */ o(T, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: () => ie(), children: "Tag Feature" })
    ] }) : te ? /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
      /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.75rem" } }),
      /* @__PURE__ */ o("span", { children: "Loading features…" })
    ] }) : /* @__PURE__ */ o(q, { children: [
      /* @__PURE__ */ o("div", { style: f.sectionLabel, children: "FEATURES OVERVIEW" }),
      /* @__PURE__ */ o("div", { style: { ...f.card, marginBottom: "0.75rem" }, children: /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ o("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#14b8a6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: "0" }),
          /* @__PURE__ */ o("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ o("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Suggested Features" }),
            /* @__PURE__ */ o("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of untagged elements on this page" })
          ] })
        ] }),
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ o("div", { style: { ...f.card, marginBottom: "0.75rem", cursor: "pointer" }, onClick: ce, children: /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ o("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: it }),
          /* @__PURE__ */ o("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ o("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Tagged Features" }),
            /* @__PURE__ */ o("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of tagged Features on this page" })
          ] })
        ] }),
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ o("div", { style: f.heatmapRow, children: [
        /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Heatmap" }),
        /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ o(
            "button",
            {
              role: "switch",
              tabIndex: 0,
              style: f.toggle(v),
              onClick: ne,
              onKeyDown: (y) => y.key === "Enter" && ne(),
              children: /* @__PURE__ */ o("span", { style: f.toggleThumb(v) })
            }
          ),
          /* @__PURE__ */ o(T, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ o(
          T,
          {
            variant: _ ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              I(!0), e({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Re-Select"
          }
        ),
        /* @__PURE__ */ o(
          T,
          {
            variant: "secondary",
            style: _ ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              I(!1), e({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Hide Selector"
          }
        )
      ] })
    ] }) }) })
  ] });
}
const Gr = new Ln({
  defaultOptions: { mutations: { retry: 0 } }
});
class Kr {
  iframe = null;
  dragHandle = null;
  gripButton = null;
  messageCallback = null;
  isReady = !1;
  mode = null;
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
  create(t, i) {
    if (console.log("[Visual Designer] EditorFrame.create() called with mode:", i), this.iframe) {
      console.warn("[Visual Designer] EditorFrame already created, skipping");
      return;
    }
    this.mode = i || null, this.messageCallback = t, console.log("[Visual Designer] Creating editor iframe with mode:", this.mode), this.iframe = document.createElement("iframe"), this.iframe.id = "designer-editor-frame", this.iframe.style.cssText = `
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
    const n = () => {
      document.body ? (document.body.appendChild(this.iframe), this.dragHandle && document.body.appendChild(this.dragHandle), this.iframe && (this.iframe.onload = () => {
        this.isReady = !0, this.renderEditorContent(), this.updateDragHandlePosition();
      })) : document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", n) : setTimeout(n, 100);
    };
    n();
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
  sendElementSelected(t) {
    this.elementSelectedState = { selector: t.selector, elementInfo: t.elementInfo, xpath: t.xpath }, this.renderEditorContent(), this.show();
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
  sendMessage(t) {
    if (!this.iframe || !this.isReady) {
      setTimeout(() => this.sendMessage(t), 100);
      return;
    }
    const i = this.iframe.contentWindow;
    i && i.postMessage(t, "*");
  }
  /**
   * Load editor HTML content (minimal shell - Preact renders the UI)
   */
  loadEditorHtml() {
    const t = this.getMinimalEditorHtml(), i = new Blob([t], { type: "text/html" }), n = URL.createObjectURL(i);
    this.iframe && (this.iframe.src = n);
  }
  /**
   * Render Preact editor component into iframe
   */
  renderEditorContent() {
    if (!this.iframe || !this.isReady) return;
    const t = this.iframe.contentDocument, i = t?.getElementById("designer-editor-root");
    if (!t || !i) return;
    const n = (s) => this.messageCallback?.(s), r = this.mode === "tag-page" ? /* @__PURE__ */ o(Dr, { onMessage: n }) : this.mode === "tag-feature" ? /* @__PURE__ */ o(
      jr,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    ) : /* @__PURE__ */ o(
      pr,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    );
    be(
      /* @__PURE__ */ o(er, { client: Gr, children: r }),
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
  <style>${hr}</style>
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
    const t = document.createElement("div");
    t.style.cssText = `
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
    `, t.onmouseenter = () => {
      t.style.background = "transparent", t.style.border = "none";
    }, t.onmouseleave = () => {
      t.style.background = "transparent", t.style.border = "none";
    };
    const i = document.createElement("iconify-icon");
    i.setAttribute("icon", "pepicons-print:dots-x"), i.style.cssText = "font-size: 18px; color: #64748b; pointer-events: none;", t.appendChild(i), this.dragHandle.appendChild(t), this.gripButton = t, t.addEventListener("mousedown", this.handleMouseDown, !0), document.addEventListener("mousemove", this.handleMouseMove, !0), document.addEventListener("mouseup", this.handleMouseUp, !0), window.addEventListener("mousemove", this.handleMouseMove, !0), window.addEventListener("mouseup", this.handleMouseUp, !0);
  }
  /**
   * Update drag handle position to match iframe
   */
  updateDragHandlePosition() {
    if (!this.iframe || !this.dragHandle)
      return;
    const t = this.iframe.getBoundingClientRect();
    this.dragHandle.style.top = `${t.top}px`, this.dragHandle.style.left = `${t.left}px`, this.dragHandle.style.width = `${t.width}px`;
  }
  /**
   * Handle mouse down on drag handle
   */
  handleMouseDown = (t) => {
    if (!this.iframe || !this.dragHandle)
      return;
    this.mouseDownX = t.clientX, this.mouseDownY = t.clientY, this.isMouseDown = !0, this.isDragging = !1;
    const i = this.iframe.getBoundingClientRect();
    this.dragStartX = t.clientX - i.left, this.dragStartY = t.clientY - i.top, t.preventDefault(), t.stopPropagation();
  };
  /**
   * Handle mouse move during drag
   */
  handleMouseMove = (t) => {
    if (!this.isMouseDown || !this.iframe || !this.dragHandle)
      return;
    if (!this.isDragging) {
      const d = Math.abs(t.clientX - this.mouseDownX), h = Math.abs(t.clientY - this.mouseDownY);
      if (Math.sqrt(d * d + h * h) > this.dragThreshold)
        this.isDragging = !0, document.body.style.cursor = "grabbing", document.documentElement.style.cursor = "grabbing", document.body.style.userSelect = "none", document.documentElement.style.userSelect = "none", this.iframe && (this.iframe.style.pointerEvents = "none"), this.gripButton && (this.gripButton.style.cursor = "grabbing");
      else
        return;
    }
    t.preventDefault(), t.stopPropagation();
    const i = t.clientX - this.dragStartX, n = t.clientY - this.dragStartY, r = window.innerWidth, s = window.innerHeight, a = this.iframe.offsetWidth, l = Math.max(-a + 50, Math.min(i, r - 50)), u = Math.max(0, Math.min(n, s - 100));
    this.iframe.style.left = `${l}px`, this.iframe.style.top = `${u}px`, this.iframe.style.right = "auto", this.iframe.style.bottom = "auto", this.dragHandle.style.left = `${l}px`, this.dragHandle.style.top = `${u}px`;
  };
  /**
   * Handle mouse up to end drag
   */
  handleMouseUp = (t) => {
    this.isMouseDown && (this.isDragging = !1, this.isMouseDown = !1, document.body.style.cursor = "", document.documentElement.style.cursor = "", document.body.style.userSelect = "", document.documentElement.style.userSelect = "", this.iframe && (this.iframe.style.pointerEvents = ""), this.gripButton && (this.gripButton.style.cursor = "grab"), t.preventDefault(), t.stopPropagation());
  };
  /**
   * Handle messages from iframe
   */
  handleMessage = (t) => {
    const i = t.data;
    !i || !i.type || (this.messageCallback && this.messageCallback(i), (i.type === "CANCEL" || i.type === "GUIDE_SAVED") && this.hide());
  };
}
const qr = "visual-designer-guides", mi = "1.0.0";
class Vr {
  storageKey;
  constructor(t = qr) {
    this.storageKey = t;
  }
  getGuides() {
    try {
      const t = localStorage.getItem(this.storageKey);
      if (!t) return [];
      const i = JSON.parse(t);
      return i.version !== mi ? (this.clear(), []) : i.guides || [];
    } catch {
      return [];
    }
  }
  getGuidesByPage(t) {
    return this.getGuides().filter((n) => n.page === t && n.status === "active");
  }
  saveGuide(t) {
    const i = this.getGuides(), n = i.findIndex((s) => s.id === t.id), r = {
      ...t,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: t.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    n >= 0 ? i[n] = r : i.push(r), this.saveGuides(i);
  }
  deleteGuide(t) {
    const i = this.getGuides().filter((n) => n.id !== t);
    this.saveGuides(i);
  }
  saveGuides(t) {
    const i = { guides: t, version: mi };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(t) {
    return this.getGuides().find((i) => i.id === t) || null;
  }
}
function Yr({ onExit: e }) {
  const t = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: C.bg,
    border: `2px solid ${C.primary}`,
    borderRadius: C.borderRadius,
    color: C.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: C.fontFamily,
    cursor: "pointer",
    zIndex: String(C.zIndex.controls),
    boxShadow: C.shadow,
    transition: "all 0.2s ease",
    pointerEvents: "auto"
  };
  return /* @__PURE__ */ o(
    "button",
    {
      id: "designer-exit-editor-btn",
      style: t,
      onClick: e,
      onMouseEnter: (i) => {
        i.currentTarget.style.background = C.primary, i.currentTarget.style.color = C.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = C.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = C.bg, i.currentTarget.style.color = C.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = C.shadow;
      },
      children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function Xr() {
  return /* @__PURE__ */ o(
    "div",
    {
      id: "designer-red-border-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: `5px solid ${C.primary}`,
        pointerEvents: "none",
        zIndex: C.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function Jr() {
  return /* @__PURE__ */ o(
    "div",
    {
      id: "designer-studio-badge",
      style: {
        position: "fixed",
        top: "4px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "0px 10px 3px",
        background: C.primary,
        color: C.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: C.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${C.primary}`,
        borderTop: "none",
        zIndex: C.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function Zr() {
  return /* @__PURE__ */ o(
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
        zIndex: C.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: C.fontFamily
      },
      children: [
        /* @__PURE__ */ o(
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
              /* @__PURE__ */ o(
                "div",
                {
                  style: {
                    width: 56,
                    height: 56,
                    border: "3px solid #e2e8f0",
                    borderTopColor: C.primary,
                    borderRadius: "50%",
                    animation: "vd-spin 0.8s linear infinite",
                    marginBottom: "1.5rem"
                  }
                }
              ),
              /* @__PURE__ */ o(
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
              /* @__PURE__ */ o(
                "div",
                {
                  style: {
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    fontWeight: 500
                  },
                  children: [
                    /* @__PURE__ */ o("span", { style: { animation: "vd-dot1 1.4s ease-in-out infinite" }, children: "." }),
                    /* @__PURE__ */ o("span", { style: { animation: "vd-dot2 1.4s ease-in-out infinite" }, children: "." }),
                    /* @__PURE__ */ o("span", { style: { animation: "vd-dot3 1.4s ease-in-out infinite" }, children: "." })
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ o("style", { children: `
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
function es(e) {
  return /* @__PURE__ */ o(q, { children: [
    e.showExitButton && /* @__PURE__ */ o(Yr, { onExit: e.onExitEditor }),
    e.showRedBorder && /* @__PURE__ */ o(Xr, {}),
    e.showBadge && /* @__PURE__ */ o(Jr, {}),
    e.showLoading && /* @__PURE__ */ o(Zr, {})
  ] });
}
function ts(e, t) {
  be(/* @__PURE__ */ o(es, { ...t }), e);
}
class ji {
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
  constructor(t = {}) {
    this.config = t, this.storage = new Vr(t.storageKey), this.editorMode = new Zi(), this.guideRenderer = new dn(), this.featureHeatmapRenderer = new hn(), this.editorFrame = new Kr();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((i) => this.config.onGuideDismissed?.(i)), this.shouldEnableEditorMode() ? (this.showLoading = !0, this.renderOverlays(), this.enableEditor()) : this.loadGuides(), this.heatmapEnabled = localStorage.getItem("designerHeatmapEnabled") === "true", this.renderFeatureHeatmap(), this.setupEventListeners();
  }
  enableEditor() {
    if (this.isEditorMode) return;
    this.isEditorMode = !0;
    let t = typeof window < "u" && window.__visualDesignerMode || null;
    t || (t = localStorage.getItem("designerModeType") || null), this.editorFrame.create((n) => this.handleEditorMessage(n), t);
    const i = t === "tag-page" || t === "tag-feature";
    i || this.editorMode.activate((n) => this.handleEditorMessage(n)), this.ensureSDKRoot(), this.renderOverlays(), localStorage.setItem("designerMode", "true"), t && localStorage.setItem("designerModeType", t), setTimeout(() => {
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
    return this.storage.getGuidesByPage(Ge());
  }
  saveGuide(t) {
    const i = {
      ...t,
      id: Yi(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.storage.saveGuide(i), this.isEditorMode || this.loadGuides(), this.config.onGuideSaved?.(i), i;
  }
  deleteGuide(t) {
    this.storage.deleteGuide(t), this.guideRenderer.dismissGuide(t);
  }
  loadGuides() {
    this.guideRenderer.renderGuides(this.storage.getGuides());
  }
  isEditorModeActive() {
    return this.isEditorMode;
  }
  shouldEnableEditorMode() {
    return this.config.editorMode !== void 0 ? this.config.editorMode : typeof window < "u" && window.__visualDesignerWasLaunched ? !0 : localStorage.getItem("designerMode") === "true";
  }
  handleEditorMessage(t) {
    switch (t.type) {
      case "ELEMENT_SELECTED":
        this.handleElementSelected(t);
        break;
      case "SAVE_GUIDE":
        this.handleSaveGuide(t);
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
        this.handleHeatmapToggle(t.enabled);
        break;
      case "FEATURES_FOR_HEATMAP":
        this.handleFeaturesForHeatmap(t.features);
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
  handleElementSelected(t) {
    this.editorFrame.sendElementSelected(t);
  }
  handleSaveGuide(t) {
    this.saveGuide({
      ...t.guide,
      page: Ge()
    });
  }
  handleHeatmapToggle(t) {
    this.heatmapEnabled = t;
    try {
      localStorage.setItem("designerHeatmapEnabled", String(t));
    } catch {
    }
    this.renderFeatureHeatmap();
  }
  handleFeaturesForHeatmap(t) {
    this.featuresForHeatmap = t.map((i) => {
      let r = (i.rules?.find(
        (s) => s.selector_type === "xpath" && (s.selector_value ?? "").trim() !== ""
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
    let t, i;
    const n = () => {
      this.guideRenderer.updatePositions(this.storage.getGuides());
    }, r = () => {
      this.featureHeatmapRenderer.updatePositions(this.getTaggedFeatures());
    };
    window.addEventListener("resize", () => {
      clearTimeout(t), t = window.setTimeout(() => {
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
    );
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
    this.ensureSDKRoot(), this.sdkRoot && ts(this.sdkRoot, {
      showExitButton: this.isEditorMode,
      showRedBorder: this.isEditorMode,
      showBadge: this.isEditorMode,
      showLoading: this.showLoading,
      onExitEditor: () => this.disableEditor()
    });
  }
  injectMontserratFont() {
    if (typeof document > "u" || !document.head || document.getElementById("designer-montserrat-font")) return;
    const t = document.createElement("link");
    t.id = "designer-montserrat-font", t.rel = "stylesheet", t.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap", document.head.appendChild(t);
  }
  injectIconifyScript() {
    if (typeof document > "u" || !document.head || document.getElementById("designer-iconify-script")) return;
    const t = document.createElement("script");
    t.id = "designer-iconify-script", t.src = "https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js", t.async = !0, document.head.appendChild(t);
  }
}
let U = null, Gi = !1;
function ae(e) {
  return U || (U = new ji(e), U.init(), U);
}
function Ki() {
  return U;
}
function qi(e) {
  !e || !Array.isArray(e) || e.forEach((t) => {
    if (!t || !Array.isArray(t) || t.length === 0) return;
    const i = t[0], n = t.slice(1);
    try {
      switch (i) {
        case "initialize":
          ae(n[0]);
          break;
        case "identify":
          n[0] && console.log("[Visual Designer] identify (snippet) called with:", n[0]);
          break;
        case "enableEditor":
          (U ?? ae()).enableEditor();
          break;
        case "disableEditor":
          U?.disableEditor();
          break;
        case "loadGuides":
          U?.loadGuides();
          break;
        case "getGuides":
          return U?.getGuides();
        default:
          console.warn("[Visual Designer] Unknown snippet method:", i);
      }
    } catch (r) {
      console.error("[Visual Designer] Error processing queued call:", i, r);
    }
  });
}
if (typeof window < "u") {
  const e = window.visualDesigner;
  e && Array.isArray(e._q) && (Gi = !0, e.initialize = (t) => ae(t), e.identify = (t) => {
    t && console.log("[Visual Designer] identify (snippet) called with:", t);
  }, e.enableEditor = () => (U ?? ae()).enableEditor(), e.disableEditor = () => U?.disableEditor(), e.loadGuides = () => U?.loadGuides(), e.getGuides = () => U?.getGuides(), e.getInstance = Ki, e.init = ae, qi(e._q));
  try {
    const t = new URL(window.location.href), i = t.searchParams.get("designer"), n = t.searchParams.get("mode"), r = t.searchParams.get("iud");
    i === "true" && (n && (window.__visualDesignerMode = n, localStorage.setItem("designerModeType", n)), localStorage.setItem("designerMode", "true"), r && localStorage.setItem(Qi, r), t.searchParams.delete("designer"), t.searchParams.delete("mode"), t.searchParams.delete("iud"), window.history.replaceState({}, "", t.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !U && !Gi) {
  const e = () => {
    U || ae();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
typeof window < "u" && (window.VisualDesigner = {
  init: ae,
  initialize: ae,
  getInstance: Ki,
  DesignerSDK: ji,
  apiClient: V,
  _processQueue: qi
});
export {
  ji as DesignerSDK,
  qi as _processQueue,
  V as apiClient,
  Ki as getInstance,
  ae as init
};
