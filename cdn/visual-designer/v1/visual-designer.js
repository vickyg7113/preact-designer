class Le {
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
      const c = this.generatePathSelector(n);
      if (!c) return null;
      const h = u.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      l.push(`${c}:contains('${h}')`);
      for (let d = 1; d < s.length; d++) l.push(this.buildSegment(s[d]));
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
function kt(e) {
  const t = window.getComputedStyle(e);
  return t.display !== "none" && t.visibility !== "hidden" && t.opacity !== "0" && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().width > 0;
}
function Ue() {
  return window.location.pathname || "/";
}
function Ke() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Yi(e) {
  const t = e.getBoundingClientRect();
  return t.top >= 0 && t.left >= 0 && t.bottom <= (window.innerHeight || document.documentElement.clientHeight) && t.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function Xi(e) {
  Yi(e) || e.scrollIntoView({ behavior: "smooth", block: "center" });
}
const Tt = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class Ji {
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
      if (i.closest(Tt)) {
        this.hideHighlight();
        return;
      }
      if (!kt(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (t) => {
    if (!this.isActive) return;
    const i = t.target;
    i && (i.closest(Tt) || (t.preventDefault(), t.stopPropagation(), t.stopImmediatePropagation(), kt(i) && this.selectElement(i)));
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
    const i = Le.generateSelector(t), n = Vi(t), r = Le.getXPath(t);
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
var We, w, di, J, Pt, ui, hi, fi, dt, Je, Ze, pi, _e = {}, mi = [], Zi = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, be = Array.isArray;
function K(e, t) {
  for (var i in t) e[i] = t[i];
  return e;
}
function ut(e) {
  e && e.parentNode && e.parentNode.removeChild(e);
}
function et(e, t, i) {
  var n, r, s, a = {};
  for (s in t) s == "key" ? n = t[s] : s == "ref" ? r = t[s] : a[s] = t[s];
  if (arguments.length > 2 && (a.children = arguments.length > 3 ? We.call(arguments, 2) : i), typeof e == "function" && e.defaultProps != null) for (s in e.defaultProps) a[s] === void 0 && (a[s] = e.defaultProps[s]);
  return Fe(e, a, n, r, null);
}
function Fe(e, t, i, n, r) {
  var s = { type: e, props: t, key: i, ref: n, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: r ?? ++di, __i: -1, __u: 0 };
  return r == null && w.vnode != null && w.vnode(s), s;
}
function X(e) {
  return e.children;
}
function q(e, t) {
  this.props = e, this.context = t;
}
function ce(e, t) {
  if (t == null) return e.__ ? ce(e.__, e.__i + 1) : null;
  for (var i; t < e.__k.length; t++) if ((i = e.__k[t]) != null && i.__e != null) return i.__e;
  return typeof e.type == "function" ? ce(e) : null;
}
function gi(e) {
  var t, i;
  if ((e = e.__) != null && e.__c != null) {
    for (e.__e = e.__c.base = null, t = 0; t < e.__k.length; t++) if ((i = e.__k[t]) != null && i.__e != null) {
      e.__e = e.__c.base = i.__e;
      break;
    }
    return gi(e);
  }
}
function tt(e) {
  (!e.__d && (e.__d = !0) && J.push(e) && !ze.__r++ || Pt != w.debounceRendering) && ((Pt = w.debounceRendering) || ui)(ze);
}
function ze() {
  for (var e, t, i, n, r, s, a, l = 1; J.length; ) J.length > l && J.sort(hi), e = J.shift(), l = J.length, e.__d && (i = void 0, n = void 0, r = (n = (t = e).__v).__e, s = [], a = [], t.__P && ((i = K({}, n)).__v = n.__v + 1, w.vnode && w.vnode(i), ht(t.__P, i, n, t.__n, t.__P.namespaceURI, 32 & n.__u ? [r] : null, s, r ?? ce(n), !!(32 & n.__u), a), i.__v = n.__v, i.__.__k[i.__i] = i, vi(s, i, a), n.__e = n.__ = null, i.__e != r && gi(i)));
  ze.__r = 0;
}
function yi(e, t, i, n, r, s, a, l, u, c, h) {
  var d, p, m, v, _, b, g, y = n && n.__k || mi, P = t.length;
  for (u = en(i, t, y, u, P), d = 0; d < P; d++) (m = i.__k[d]) != null && (p = m.__i == -1 ? _e : y[m.__i] || _e, m.__i = d, b = ht(e, m, p, r, s, a, l, u, c, h), v = m.__e, m.ref && p.ref != m.ref && (p.ref && ft(p.ref, null, m), h.push(m.ref, m.__c || v, m)), _ == null && v != null && (_ = v), (g = !!(4 & m.__u)) || p.__k === m.__k ? u = _i(m, u, e, g) : typeof m.type == "function" && b !== void 0 ? u = b : v && (u = v.nextSibling), m.__u &= -7);
  return i.__e = _, u;
}
function en(e, t, i, n, r) {
  var s, a, l, u, c, h = i.length, d = h, p = 0;
  for (e.__k = new Array(r), s = 0; s < r; s++) (a = t[s]) != null && typeof a != "boolean" && typeof a != "function" ? (typeof a == "string" || typeof a == "number" || typeof a == "bigint" || a.constructor == String ? a = e.__k[s] = Fe(null, a, null, null, null) : be(a) ? a = e.__k[s] = Fe(X, { children: a }, null, null, null) : a.constructor === void 0 && a.__b > 0 ? a = e.__k[s] = Fe(a.type, a.props, a.key, a.ref ? a.ref : null, a.__v) : e.__k[s] = a, u = s + p, a.__ = e, a.__b = e.__b + 1, l = null, (c = a.__i = tn(a, i, u, d)) != -1 && (d--, (l = i[c]) && (l.__u |= 2)), l == null || l.__v == null ? (c == -1 && (r > h ? p-- : r < h && p++), typeof a.type != "function" && (a.__u |= 4)) : c != u && (c == u - 1 ? p-- : c == u + 1 ? p++ : (c > u ? p-- : p++, a.__u |= 4))) : e.__k[s] = null;
  if (d) for (s = 0; s < h; s++) (l = i[s]) != null && (2 & l.__u) == 0 && (l.__e == n && (n = ce(l)), wi(l, l));
  return n;
}
function _i(e, t, i, n) {
  var r, s;
  if (typeof e.type == "function") {
    for (r = e.__k, s = 0; r && s < r.length; s++) r[s] && (r[s].__ = e, t = _i(r[s], t, i, n));
    return t;
  }
  e.__e != t && (n && (t && e.type && !t.parentNode && (t = ce(e)), i.insertBefore(e.__e, t || null)), t = e.__e);
  do
    t = t && t.nextSibling;
  while (t != null && t.nodeType == 8);
  return t;
}
function He(e, t) {
  return t = t || [], e == null || typeof e == "boolean" || (be(e) ? e.some(function(i) {
    He(i, t);
  }) : t.push(e)), t;
}
function tn(e, t, i, n) {
  var r, s, a, l = e.key, u = e.type, c = t[i], h = c != null && (2 & c.__u) == 0;
  if (c === null && l == null || h && l == c.key && u == c.type) return i;
  if (n > (h ? 1 : 0)) {
    for (r = i - 1, s = i + 1; r >= 0 || s < t.length; ) if ((c = t[a = r >= 0 ? r-- : s++]) != null && (2 & c.__u) == 0 && l == c.key && u == c.type) return a;
  }
  return -1;
}
function It(e, t, i) {
  t[0] == "-" ? e.setProperty(t, i ?? "") : e[t] = i == null ? "" : typeof i != "number" || Zi.test(t) ? i : i + "px";
}
function ke(e, t, i, n, r) {
  var s, a;
  e: if (t == "style") if (typeof i == "string") e.style.cssText = i;
  else {
    if (typeof n == "string" && (e.style.cssText = n = ""), n) for (t in n) i && t in i || It(e.style, t, "");
    if (i) for (t in i) n && i[t] == n[t] || It(e.style, t, i[t]);
  }
  else if (t[0] == "o" && t[1] == "n") s = t != (t = t.replace(fi, "$1")), a = t.toLowerCase(), t = a in e || t == "onFocusOut" || t == "onFocusIn" ? a.slice(2) : t.slice(2), e.l || (e.l = {}), e.l[t + s] = i, i ? n ? i.u = n.u : (i.u = dt, e.addEventListener(t, s ? Ze : Je, s)) : e.removeEventListener(t, s ? Ze : Je, s);
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
function Ot(e) {
  return function(t) {
    if (this.l) {
      var i = this.l[t.type + e];
      if (t.t == null) t.t = dt++;
      else if (t.t < i.u) return;
      return i(w.event ? w.event(t) : t);
    }
  };
}
function ht(e, t, i, n, r, s, a, l, u, c) {
  var h, d, p, m, v, _, b, g, y, P, R, L, z, D, k, F, H, T = t.type;
  if (t.constructor !== void 0) return null;
  128 & i.__u && (u = !!(32 & i.__u), s = [l = t.__e = i.__e]), (h = w.__b) && h(t);
  e: if (typeof T == "function") try {
    if (g = t.props, y = "prototype" in T && T.prototype.render, P = (h = T.contextType) && n[h.__c], R = h ? P ? P.props.value : h.__ : n, i.__c ? b = (d = t.__c = i.__c).__ = d.__E : (y ? t.__c = d = new T(g, R) : (t.__c = d = new q(g, R), d.constructor = T, d.render = rn), P && P.sub(d), d.state || (d.state = {}), d.__n = n, p = d.__d = !0, d.__h = [], d._sb = []), y && d.__s == null && (d.__s = d.state), y && T.getDerivedStateFromProps != null && (d.__s == d.state && (d.__s = K({}, d.__s)), K(d.__s, T.getDerivedStateFromProps(g, d.__s))), m = d.props, v = d.state, d.__v = t, p) y && T.getDerivedStateFromProps == null && d.componentWillMount != null && d.componentWillMount(), y && d.componentDidMount != null && d.__h.push(d.componentDidMount);
    else {
      if (y && T.getDerivedStateFromProps == null && g !== m && d.componentWillReceiveProps != null && d.componentWillReceiveProps(g, R), t.__v == i.__v || !d.__e && d.shouldComponentUpdate != null && d.shouldComponentUpdate(g, d.__s, R) === !1) {
        for (t.__v != i.__v && (d.props = g, d.state = d.__s, d.__d = !1), t.__e = i.__e, t.__k = i.__k, t.__k.some(function(U) {
          U && (U.__ = t);
        }), L = 0; L < d._sb.length; L++) d.__h.push(d._sb[L]);
        d._sb = [], d.__h.length && a.push(d);
        break e;
      }
      d.componentWillUpdate != null && d.componentWillUpdate(g, d.__s, R), y && d.componentDidUpdate != null && d.__h.push(function() {
        d.componentDidUpdate(m, v, _);
      });
    }
    if (d.context = R, d.props = g, d.__P = e, d.__e = !1, z = w.__r, D = 0, y) {
      for (d.state = d.__s, d.__d = !1, z && z(t), h = d.render(d.props, d.state, d.context), k = 0; k < d._sb.length; k++) d.__h.push(d._sb[k]);
      d._sb = [];
    } else do
      d.__d = !1, z && z(t), h = d.render(d.props, d.state, d.context), d.state = d.__s;
    while (d.__d && ++D < 25);
    d.state = d.__s, d.getChildContext != null && (n = K(K({}, n), d.getChildContext())), y && !p && d.getSnapshotBeforeUpdate != null && (_ = d.getSnapshotBeforeUpdate(m, v)), F = h, h != null && h.type === X && h.key == null && (F = bi(h.props.children)), l = yi(e, be(F) ? F : [F], t, i, n, r, s, a, l, u, c), d.base = t.__e, t.__u &= -161, d.__h.length && a.push(d), b && (d.__E = d.__ = null);
  } catch (U) {
    if (t.__v = null, u || s != null) if (U.then) {
      for (t.__u |= u ? 160 : 128; l && l.nodeType == 8 && l.nextSibling; ) l = l.nextSibling;
      s[s.indexOf(l)] = null, t.__e = l;
    } else {
      for (H = s.length; H--; ) ut(s[H]);
      it(t);
    }
    else t.__e = i.__e, t.__k = i.__k, U.then || it(t);
    w.__e(U, t, i);
  }
  else s == null && t.__v == i.__v ? (t.__k = i.__k, t.__e = i.__e) : l = t.__e = nn(i.__e, t, i, n, r, s, a, u, c);
  return (h = w.diffed) && h(t), 128 & t.__u ? void 0 : l;
}
function it(e) {
  e && e.__c && (e.__c.__e = !0), e && e.__k && e.__k.forEach(it);
}
function vi(e, t, i) {
  for (var n = 0; n < i.length; n++) ft(i[n], i[++n], i[++n]);
  w.__c && w.__c(t, e), e.some(function(r) {
    try {
      e = r.__h, r.__h = [], e.some(function(s) {
        s.call(r);
      });
    } catch (s) {
      w.__e(s, r.__v);
    }
  });
}
function bi(e) {
  return typeof e != "object" || e == null || e.__b && e.__b > 0 ? e : be(e) ? e.map(bi) : K({}, e);
}
function nn(e, t, i, n, r, s, a, l, u) {
  var c, h, d, p, m, v, _, b = i.props || _e, g = t.props, y = t.type;
  if (y == "svg" ? r = "http://www.w3.org/2000/svg" : y == "math" ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), s != null) {
    for (c = 0; c < s.length; c++) if ((m = s[c]) && "setAttribute" in m == !!y && (y ? m.localName == y : m.nodeType == 3)) {
      e = m, s[c] = null;
      break;
    }
  }
  if (e == null) {
    if (y == null) return document.createTextNode(g);
    e = document.createElementNS(r, y, g.is && g), l && (w.__m && w.__m(t, s), l = !1), s = null;
  }
  if (y == null) b === g || l && e.data == g || (e.data = g);
  else {
    if (s = s && We.call(e.childNodes), !l && s != null) for (b = {}, c = 0; c < e.attributes.length; c++) b[(m = e.attributes[c]).name] = m.value;
    for (c in b) if (m = b[c], c != "children") {
      if (c == "dangerouslySetInnerHTML") d = m;
      else if (!(c in g)) {
        if (c == "value" && "defaultValue" in g || c == "checked" && "defaultChecked" in g) continue;
        ke(e, c, null, m, r);
      }
    }
    for (c in g) m = g[c], c == "children" ? p = m : c == "dangerouslySetInnerHTML" ? h = m : c == "value" ? v = m : c == "checked" ? _ = m : l && typeof m != "function" || b[c] === m || ke(e, c, m, b[c], r);
    if (h) l || d && (h.__html == d.__html || h.__html == e.innerHTML) || (e.innerHTML = h.__html), t.__k = [];
    else if (d && (e.innerHTML = ""), yi(t.type == "template" ? e.content : e, be(p) ? p : [p], t, i, n, y == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r, s, a, s ? s[0] : i.__k && ce(i, 0), l, u), s != null) for (c = s.length; c--; ) ut(s[c]);
    l || (c = "value", y == "progress" && v == null ? e.removeAttribute("value") : v != null && (v !== e[c] || y == "progress" && !v || y == "option" && v != b[c]) && ke(e, c, v, b[c], r), c = "checked", _ != null && _ != e[c] && ke(e, c, _, b[c], r));
  }
  return e;
}
function ft(e, t, i) {
  try {
    if (typeof e == "function") {
      var n = typeof e.__u == "function";
      n && e.__u(), n && t == null || (e.__u = e(t));
    } else e.current = t;
  } catch (r) {
    w.__e(r, i);
  }
}
function wi(e, t, i) {
  var n, r;
  if (w.unmount && w.unmount(e), (n = e.ref) && (n.current && n.current != e.__e || ft(n, null, t)), (n = e.__c) != null) {
    if (n.componentWillUnmount) try {
      n.componentWillUnmount();
    } catch (s) {
      w.__e(s, t);
    }
    n.base = n.__P = null;
  }
  if (n = e.__k) for (r = 0; r < n.length; r++) n[r] && wi(n[r], t, i || typeof e.type != "function");
  i || ut(e.__e), e.__c = e.__ = e.__e = void 0;
}
function rn(e, t, i) {
  return this.constructor(e, i);
}
function de(e, t, i) {
  var n, r, s, a;
  t == document && (t = document.documentElement), w.__ && w.__(e, t), r = (n = !1) ? null : t.__k, s = [], a = [], ht(t, e = t.__k = et(X, null, [e]), r || _e, _e, t.namespaceURI, r ? null : t.firstChild ? We.call(t.childNodes) : null, s, r ? r.__e : t.firstChild, n, a), vi(s, e, a);
}
function pt(e) {
  function t(i) {
    var n, r;
    return this.getChildContext || (n = /* @__PURE__ */ new Set(), (r = {})[t.__c] = this, this.getChildContext = function() {
      return r;
    }, this.componentWillUnmount = function() {
      n = null;
    }, this.shouldComponentUpdate = function(s) {
      this.props.value != s.value && n.forEach(function(a) {
        a.__e = !0, tt(a);
      });
    }, this.sub = function(s) {
      n.add(s);
      var a = s.componentWillUnmount;
      s.componentWillUnmount = function() {
        n && n.delete(s), a && a.call(s);
      };
    }), i.children;
  }
  return t.__c = "__cC" + pi++, t.__ = e, t.Provider = t.__l = (t.Consumer = function(i, n) {
    return i.children(n);
  }).contextType = t, t;
}
We = mi.slice, w = { __e: function(e, t, i, n) {
  for (var r, s, a; t = t.__; ) if ((r = t.__c) && !r.__) try {
    if ((s = r.constructor) && s.getDerivedStateFromError != null && (r.setState(s.getDerivedStateFromError(e)), a = r.__d), r.componentDidCatch != null && (r.componentDidCatch(e, n || {}), a = r.__d), a) return r.__E = r;
  } catch (l) {
    e = l;
  }
  throw e;
} }, di = 0, q.prototype.setState = function(e, t) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = K({}, this.state), typeof e == "function" && (e = e(K({}, i), this.props)), e && K(i, e), e != null && this.__v && (t && this._sb.push(t), tt(this));
}, q.prototype.forceUpdate = function(e) {
  this.__v && (this.__e = !0, e && this.__h.push(e), tt(this));
}, q.prototype.render = X, J = [], ui = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, hi = function(e, t) {
  return e.__v.__b - t.__v.__b;
}, ze.__r = 0, fi = /(PointerCapture)$|Capture$/i, dt = 0, Je = Ot(!1), Ze = Ot(!0), pi = 0;
var sn = 0;
function o(e, t, i, n, r, s) {
  t || (t = {});
  var a, l, u = t;
  if ("ref" in u) for (l in u = {}, t) l == "ref" ? a = t[l] : u[l] = t[l];
  var c = { type: e, props: u, key: i, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --sn, __i: -1, __u: 0, __source: r, __self: s };
  if (typeof e == "function" && (a = e.defaultProps)) for (l in a) u[l] === void 0 && (u[l] = a[l]);
  return w.vnode && w.vnode(c), c;
}
const S = {
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
function on({ guide: e, top: t, left: i, arrowStyle: n, onDismiss: r }) {
  return /* @__PURE__ */ o(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": e.id,
      style: {
        position: "absolute",
        background: S.bg,
        border: `2px solid ${S.primary}`,
        borderRadius: S.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: S.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: S.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: S.text,
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
              background: S.primary,
              color: S.bg,
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
function an(e) {
  const t = { position: "absolute" };
  switch (e) {
    case "top":
      return { ...t, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${S.primary} transparent transparent transparent` };
    case "bottom":
      return { ...t, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${S.primary} transparent` };
    case "left":
      return { ...t, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${S.primary}` };
    default:
      return { ...t, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${S.primary} transparent transparent` };
  }
}
function ln(e, t, i, n) {
  const r = e.getBoundingClientRect(), s = window.pageXOffset || document.documentElement.scrollLeft, a = window.pageYOffset || document.documentElement.scrollTop, l = window.innerWidth, u = window.innerHeight;
  let c = 0, h = 0;
  switch (t) {
    case "top":
      c = r.top + a - n - 12, h = r.left + s + r.width / 2 - i / 2;
      break;
    case "bottom":
      c = r.bottom + a + 12, h = r.left + s + r.width / 2 - i / 2;
      break;
    case "left":
      c = r.top + a + r.height / 2 - n / 2, h = r.left + s - i - 12;
      break;
    default:
      c = r.top + a + r.height / 2 - n / 2, h = r.right + s + 12;
      break;
  }
  return h < s ? h = s + 10 : h + i > s + l && (h = s + l - i - 10), c < a ? c = a + 10 : c + n > a + u && (c = a + u - n - 10), { top: c, left: h, arrowStyle: an(t) };
}
class cn {
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
    const i = Ue(), n = t.filter(
      (s) => s.page === i && s.status === "active" && !this.dismissedThisSession.has(s.id)
    );
    if (n.length === 0 || (this.ensureContainer(), !this.container)) return;
    const r = [];
    for (const s of n) {
      const a = Le.findElement(s.selector);
      if (!a) continue;
      Xi(a);
      const l = ln(a, s.placement, 280, 80);
      r.push({ guide: s, target: a, pos: l });
    }
    de(
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
            zIndex: S.zIndex.guides
          },
          children: r.map(({ guide: s, pos: a }) => /* @__PURE__ */ o(
            on,
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
    this.dismissedThisSession.clear(), this.container && de(null, this.container);
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
const Rt = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function dn({ feature: e, color: t, rect: i }) {
  const n = window.pageXOffset || document.documentElement.scrollLeft, r = window.pageYOffset || document.documentElement.scrollTop;
  return /* @__PURE__ */ o(
    "div",
    {
      className: "designer-feature-heatmap-overlay",
      title: e.featureName,
      style: {
        position: "absolute",
        left: i.left + n,
        top: i.top + r,
        width: i.width,
        height: i.height,
        backgroundColor: t,
        pointerEvents: "none",
        zIndex: S.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${t}`
      }
    }
  );
}
function Dt(e) {
  return (e || "").replace(/^https?:\/\//i, "").replace(/\/$/, "").trim() || "";
}
function un() {
  try {
    return window.location.href || "";
  } catch {
    return "";
  }
}
class hn {
  container = null;
  lastEnabled = !1;
  render(t, i) {
    if (this.lastEnabled = i, this.clear(), !i || t.length === 0) return;
    const n = un(), r = Dt(n), s = t.filter((l) => l.url && Dt(l.url) === r);
    if (s.length === 0 || (this.ensureContainer(), !this.container)) return;
    const a = s.map((l, u) => {
      const c = Le.findElement(l.selector);
      if (!c) return null;
      const h = c.getBoundingClientRect(), d = Rt[u % Rt.length];
      return { feature: l, rect: h, color: d };
    }).filter(Boolean);
    de(
      /* @__PURE__ */ o(
        "div",
        {
          id: "designer-feature-heatmap-container",
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: S.zIndex.overlay - 1
          },
          children: a.map(({ feature: l, rect: u, color: c }) => /* @__PURE__ */ o(
            dn,
            {
              feature: l,
              color: c,
              rect: {
                left: u.left,
                top: u.top,
                width: u.width,
                height: u.height
              }
            },
            l.id
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
    this.container && de(null, this.container);
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
var ue = class {
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
}, Z = new pn();
function mn(e) {
  setTimeout(e, 0);
}
var te = typeof window > "u" || "Deno" in globalThis;
function B() {
}
function gn(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function nt(e) {
  return typeof e == "number" && e >= 0 && e !== 1 / 0;
}
function Si(e, t) {
  return Math.max(e + (t || 0) - Date.now(), 0);
}
function V(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function W(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function Ft(e, t) {
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
      if (t.queryHash !== mt(a, t.options))
        return !1;
    } else if (!ve(t.queryKey, a))
      return !1;
  }
  if (i !== "all") {
    const u = t.isActive();
    if (i === "active" && !u || i === "inactive" && u)
      return !1;
  }
  return !(typeof l == "boolean" && t.isStale() !== l || r && r !== t.state.fetchStatus || s && !s(t));
}
function Mt(e, t) {
  const { exact: i, status: n, predicate: r, mutationKey: s } = e;
  if (s) {
    if (!t.options.mutationKey)
      return !1;
    if (i) {
      if (ie(t.options.mutationKey) !== ie(s))
        return !1;
    } else if (!ve(t.options.mutationKey, s))
      return !1;
  }
  return !(n && t.state.status !== n || r && !r(t));
}
function mt(e, t) {
  return (t?.queryKeyHashFn || ie)(e);
}
function ie(e) {
  return JSON.stringify(
    e,
    (t, i) => rt(i) ? Object.keys(i).sort().reduce((n, r) => (n[r] = i[r], n), {}) : i
  );
}
function ve(e, t) {
  return e === t ? !0 : typeof e != typeof t ? !1 : e && t && typeof e == "object" && typeof t == "object" ? Object.keys(t).every((i) => ve(e[i], t[i])) : !1;
}
var yn = Object.prototype.hasOwnProperty;
function Ei(e, t, i = 0) {
  if (e === t)
    return e;
  if (i > 500) return t;
  const n = At(e) && At(t);
  if (!n && !(rt(e) && rt(t))) return t;
  const s = (n ? e : Object.keys(e)).length, a = n ? t : Object.keys(t), l = a.length, u = n ? new Array(l) : {};
  let c = 0;
  for (let h = 0; h < l; h++) {
    const d = n ? h : a[h], p = e[d], m = t[d];
    if (p === m) {
      u[d] = p, (n ? h < s : yn.call(e, d)) && c++;
      continue;
    }
    if (p === null || m === null || typeof p != "object" || typeof m != "object") {
      u[d] = m;
      continue;
    }
    const v = Ei(p, m, i + 1);
    u[d] = v, v === p && c++;
  }
  return s === l && c === s ? e : u;
}
function $e(e, t) {
  if (!t || Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const i in e)
    if (e[i] !== t[i])
      return !1;
  return !0;
}
function At(e) {
  return Array.isArray(e) && e.length === Object.keys(e).length;
}
function rt(e) {
  if (!Lt(e))
    return !1;
  const t = e.constructor;
  if (t === void 0)
    return !0;
  const i = t.prototype;
  return !(!Lt(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(e) !== Object.prototype);
}
function Lt(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function _n(e) {
  return new Promise((t) => {
    Z.setTimeout(t, e);
  });
}
function st(e, t, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(e, t) : i.structuralSharing !== !1 ? Ei(e, t) : t;
}
function vn(e, t, i = 0) {
  const n = [...e, t];
  return i && n.length > i ? n.slice(1) : n;
}
function bn(e, t, i = 0) {
  const n = [t, ...e];
  return i && n.length > i ? n.slice(0, -1) : n;
}
var gt = /* @__PURE__ */ Symbol();
function xi(e, t) {
  return !e.queryFn && t?.initialPromise ? () => t.initialPromise : !e.queryFn || e.queryFn === gt ? () => Promise.reject(new Error(`Missing queryFn: '${e.queryHash}'`)) : e.queryFn;
}
function yt(e, t) {
  return typeof e == "function" ? e(...t) : !!e;
}
function wn(e, t, i) {
  let n = !1, r;
  return Object.defineProperty(e, "signal", {
    enumerable: !0,
    get: () => (r ??= t(), n || (n = !0, r.aborted ? i() : r.addEventListener("abort", i, { once: !0 })), r)
  }), e;
}
var Sn = class extends ue {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (e) => {
      if (!te && window.addEventListener) {
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
}, _t = new Sn();
function ot() {
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
var En = mn;
function xn() {
  let e = [], t = 0, i = (l) => {
    l();
  }, n = (l) => {
    l();
  }, r = En;
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
var A = xn(), Cn = class extends ue {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (e) => {
      if (!te && window.addEventListener) {
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
}, Ne = new Cn();
function kn(e) {
  return Math.min(1e3 * 2 ** e, 3e4);
}
function Ci(e) {
  return (e ?? "online") === "online" ? Ne.isOnline() : !0;
}
var at = class extends Error {
  constructor(e) {
    super("CancelledError"), this.revert = e?.revert, this.silent = e?.silent;
  }
};
function ki(e) {
  let t = !1, i = 0, n;
  const r = ot(), s = () => r.status !== "pending", a = (_) => {
    if (!s()) {
      const b = new at(_);
      p(b), e.onCancel?.(b);
    }
  }, l = () => {
    t = !0;
  }, u = () => {
    t = !1;
  }, c = () => _t.isFocused() && (e.networkMode === "always" || Ne.isOnline()) && e.canRun(), h = () => Ci(e.networkMode) && e.canRun(), d = (_) => {
    s() || (n?.(), r.resolve(_));
  }, p = (_) => {
    s() || (n?.(), r.reject(_));
  }, m = () => new Promise((_) => {
    n = (b) => {
      (s() || c()) && _(b);
    }, e.onPause?.();
  }).then(() => {
    n = void 0, s() || e.onContinue?.();
  }), v = () => {
    if (s())
      return;
    let _;
    const b = i === 0 ? e.initialPromise : void 0;
    try {
      _ = b ?? e.fn();
    } catch (g) {
      _ = Promise.reject(g);
    }
    Promise.resolve(_).then(d).catch((g) => {
      if (s())
        return;
      const y = e.retry ?? (te ? 0 : 3), P = e.retryDelay ?? kn, R = typeof P == "function" ? P(i, g) : P, L = y === !0 || typeof y == "number" && i < y || typeof y == "function" && y(i, g);
      if (t || !L) {
        p(g);
        return;
      }
      i++, e.onFail?.(i, g), _n(R).then(() => c() ? void 0 : m()).then(() => {
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
var Ti = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), nt(this.gcTime) && (this.#e = Z.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(e) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      e ?? (te ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (Z.clearTimeout(this.#e), this.#e = void 0);
  }
}, Tn = class extends Ti {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(e) {
    super(), this.#a = !1, this.#o = e.defaultOptions, this.setOptions(e.options), this.observers = [], this.#r = e.client, this.#i = this.#r.getQueryCache(), this.queryKey = e.queryKey, this.queryHash = e.queryHash, this.#e = zt(this.options), this.state = e.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(e) {
    if (this.options = { ...this.#o, ...e }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const t = zt(this.options);
      t.data !== void 0 && (this.setState(
        Ut(t.data, t.dataUpdatedAt)
      ), this.#e = t);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(e, t) {
    const i = st(this.state.data, e, this.options);
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
    return this.#n?.cancel(e), t ? t.then(B).catch(B) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({ silent: !0 });
  }
  reset() {
    this.destroy(), this.setState(this.#e);
  }
  isActive() {
    return this.observers.some(
      (e) => W(e.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === gt || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (e) => V(e.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (e) => e.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(e = 0) {
    return this.state.data === void 0 ? !0 : e === "static" ? !1 : this.state.isInvalidated ? !0 : !Si(this.state.dataUpdatedAt, e);
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
      const l = xi(this.options, t), c = (() => {
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
        fetchOptions: t,
        options: this.options,
        queryKey: this.queryKey,
        client: this.#r,
        state: this.state,
        fetchFn: r
      };
      return n(l), l;
    })();
    this.options.behavior?.onFetch(a, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#s({ type: "fetch", meta: a.fetchOptions?.meta }), this.#n = ki({
      initialPromise: t?.initialPromise,
      fn: a.fetchFn,
      onCancel: (l) => {
        l instanceof at && l.revert && this.setState({
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
      if (l instanceof at) {
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
            ...Pi(i.data, this.options),
            fetchMeta: e.meta ?? null
          };
        case "success":
          const n = {
            ...i,
            ...Ut(e.data, e.dataUpdatedAt),
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
function Pi(e, t) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: Ci(t.networkMode) ? "fetching" : "paused",
    ...e === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function Ut(e, t) {
  return {
    data: e,
    dataUpdatedAt: t ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function zt(e) {
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
var Pn = class extends ue {
  constructor(e, t) {
    super(), this.options = t, this.#e = e, this.#s = null, this.#a = ot(), this.bindMethods(), this.setOptions(t);
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
    this.listeners.size === 1 && (this.#t.addObserver(this), Ht(this.#t, this.options) ? this.#u() : this.updateResult(), this.#v());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return lt(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return lt(
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
    if (this.options = this.#e.defaultQueryOptions(e), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof W(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), t._defaulted && !$e(this.options, t) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const n = this.hasListeners();
    n && $t(
      this.#t,
      i,
      this.options,
      t
    ) && this.#u(), this.updateResult(), n && (this.#t !== i || W(this.options.enabled, this.#t) !== W(t.enabled, this.#t) || V(this.options.staleTime, this.#t) !== V(t.staleTime, this.#t)) && this.#g();
    const r = this.#y();
    n && (this.#t !== i || W(this.options.enabled, this.#t) !== W(t.enabled, this.#t) || r !== this.#l) && this.#_(r);
  }
  getOptimisticResult(e) {
    const t = this.#e.getQueryCache().build(this.#e, e), i = this.createResult(t, e);
    return On(this, i) && (this.#r = i, this.#o = this.options, this.#n = this.#t.state), i;
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
    return e?.throwOnError || (t = t.catch(B)), t;
  }
  #g() {
    this.#b();
    const e = V(
      this.options.staleTime,
      this.#t
    );
    if (te || this.#r.isStale || !nt(e))
      return;
    const i = Si(this.#r.dataUpdatedAt, e) + 1;
    this.#c = Z.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(e) {
    this.#w(), this.#l = e, !(te || W(this.options.enabled, this.#t) === !1 || !nt(this.#l) || this.#l === 0) && (this.#d = Z.setInterval(() => {
      (this.options.refetchIntervalInBackground || _t.isFocused()) && this.#u();
    }, this.#l));
  }
  #v() {
    this.#g(), this.#_(this.#y());
  }
  #b() {
    this.#c && (Z.clearTimeout(this.#c), this.#c = void 0);
  }
  #w() {
    this.#d && (Z.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(e, t) {
    const i = this.#t, n = this.options, r = this.#r, s = this.#n, a = this.#o, u = e !== i ? e.state : this.#i, { state: c } = e;
    let h = { ...c }, d = !1, p;
    if (t._optimisticResults) {
      const k = this.hasListeners(), F = !k && Ht(e, t), H = k && $t(e, i, t, n);
      (F || H) && (h = {
        ...h,
        ...Pi(c.data, e.options)
      }), t._optimisticResults === "isRestoring" && (h.fetchStatus = "idle");
    }
    let { error: m, errorUpdatedAt: v, status: _ } = h;
    p = h.data;
    let b = !1;
    if (t.placeholderData !== void 0 && p === void 0 && _ === "pending") {
      let k;
      r?.isPlaceholderData && t.placeholderData === a?.placeholderData ? (k = r.data, b = !0) : k = typeof t.placeholderData == "function" ? t.placeholderData(
        this.#f?.state.data,
        this.#f
      ) : t.placeholderData, k !== void 0 && (_ = "success", p = st(
        r?.data,
        k,
        t
      ), d = !0);
    }
    if (t.select && p !== void 0 && !b)
      if (r && p === s?.data && t.select === this.#m)
        p = this.#h;
      else
        try {
          this.#m = t.select, p = t.select(p), p = st(r?.data, p, t), this.#h = p, this.#s = null;
        } catch (k) {
          this.#s = k;
        }
    this.#s && (m = this.#s, p = this.#h, v = Date.now(), _ = "error");
    const g = h.fetchStatus === "fetching", y = _ === "pending", P = _ === "error", R = y && g, L = p !== void 0, D = {
      status: _,
      fetchStatus: h.fetchStatus,
      isPending: y,
      isSuccess: _ === "success",
      isError: P,
      isInitialLoading: R,
      isLoading: R,
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
      isRefetching: g && !y,
      isLoadingError: P && !L,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: d,
      isRefetchError: P && L,
      isStale: vt(e, t),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: W(t.enabled, e) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const k = D.data !== void 0, F = D.status === "error" && !k, H = (G) => {
        F ? G.reject(D.error) : k && G.resolve(D.data);
      }, T = () => {
        const G = this.#a = D.promise = ot();
        H(G);
      }, U = this.#a;
      switch (U.status) {
        case "pending":
          e.queryHash === i.queryHash && H(U);
          break;
        case "fulfilled":
          (F || D.data !== U.value) && T();
          break;
        case "rejected":
          (!F || D.error !== U.reason) && T();
          break;
      }
    }
    return D;
  }
  updateResult() {
    const e = this.#r, t = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#f = this.#t), $e(t, e))
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
    this.#E({ listeners: i() });
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
  #E(e) {
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
  return W(t.enabled, e) !== !1 && e.state.data === void 0 && !(e.state.status === "error" && t.retryOnMount === !1);
}
function Ht(e, t) {
  return In(e, t) || e.state.data !== void 0 && lt(e, t, t.refetchOnMount);
}
function lt(e, t, i) {
  if (W(t.enabled, e) !== !1 && V(t.staleTime, e) !== "static") {
    const n = typeof i == "function" ? i(e) : i;
    return n === "always" || n !== !1 && vt(e, t);
  }
  return !1;
}
function $t(e, t, i, n) {
  return (e !== t || W(n.enabled, e) === !1) && (!i.suspense || e.state.status !== "error") && vt(e, i);
}
function vt(e, t) {
  return W(t.enabled, e) !== !1 && e.isStaleByTime(V(t.staleTime, e));
}
function On(e, t) {
  return !$e(e.getCurrentResult(), t);
}
function Nt(e) {
  return {
    onFetch: (t, i) => {
      const n = t.options, r = t.fetchOptions?.meta?.fetchMore?.direction, s = t.state.data?.pages || [], a = t.state.data?.pageParams || [];
      let l = { pages: [], pageParams: [] }, u = 0;
      const c = async () => {
        let h = !1;
        const d = (v) => {
          wn(
            v,
            () => t.signal,
            () => h = !0
          );
        }, p = xi(t.options, t.fetchOptions), m = async (v, _, b) => {
          if (h)
            return Promise.reject();
          if (_ == null && v.pages.length)
            return Promise.resolve(v);
          const y = (() => {
            const z = {
              client: t.client,
              queryKey: t.queryKey,
              pageParam: _,
              direction: b ? "backward" : "forward",
              meta: t.options.meta
            };
            return d(z), z;
          })(), P = await p(y), { maxPages: R } = t.options, L = b ? bn : vn;
          return {
            pages: L(v.pages, P, R),
            pageParams: L(v.pageParams, _, R)
          };
        };
        if (r && s.length) {
          const v = r === "backward", _ = v ? Rn : Bt, b = {
            pages: s,
            pageParams: a
          }, g = _(n, b);
          l = await m(b, g, v);
        } else {
          const v = e ?? s.length;
          do {
            const _ = u === 0 ? a[0] ?? n.initialPageParam : Bt(n, l);
            if (u > 0 && _ == null)
              break;
            l = await m(l, _), u++;
          } while (u < v);
        }
        return l;
      };
      t.options.persister ? t.fetchFn = () => t.options.persister?.(
        c,
        {
          client: t.client,
          queryKey: t.queryKey,
          meta: t.options.meta,
          signal: t.signal
        },
        i
      ) : t.fetchFn = c;
    }
  };
}
function Bt(e, { pages: t, pageParams: i }) {
  const n = t.length - 1;
  return t.length > 0 ? e.getNextPageParam(
    t[n],
    t,
    i[n],
    i
  ) : void 0;
}
function Rn(e, { pages: t, pageParams: i }) {
  return t.length > 0 ? e.getPreviousPageParam?.(t[0], t, i[0], i) : void 0;
}
var Dn = class extends Ti {
  #e;
  #t;
  #i;
  #r;
  constructor(e) {
    super(), this.#e = e.client, this.mutationId = e.mutationId, this.#i = e.mutationCache, this.#t = [], this.state = e.state || Ii(), this.setOptions(e.options), this.scheduleGc();
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
    this.#r = ki({
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
function Ii() {
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
var Fn = class extends ue {
  constructor(e = {}) {
    super(), this.config = e, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(e, t, i) {
    const n = new Dn({
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
    const t = Te(e);
    if (typeof t == "string") {
      const i = this.#t.get(t);
      i ? i.push(e) : this.#t.set(t, [e]);
    }
    this.notify({ type: "added", mutation: e });
  }
  remove(e) {
    if (this.#e.delete(e)) {
      const t = Te(e);
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
    const t = Te(e);
    if (typeof t == "string") {
      const n = this.#t.get(t)?.find(
        (r) => r.state.status === "pending"
      );
      return !n || n === e;
    } else
      return !0;
  }
  runNext(e) {
    const t = Te(e);
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
      (i) => Mt(t, i)
    );
  }
  findAll(e = {}) {
    return this.getAll().filter((t) => Mt(e, t));
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
        e.map((t) => t.continue().catch(B))
      )
    );
  }
};
function Te(e) {
  return e.options.scope?.id;
}
var Mn = class extends ue {
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
    this.options = this.#e.defaultMutationOptions(e), $e(this.options, t) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), t?.mutationKey && this.options.mutationKey && ie(t.mutationKey) !== ie(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
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
    const e = this.#i?.state ?? Ii();
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
}, An = class extends ue {
  constructor(e = {}) {
    super(), this.config = e, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(e, t, i) {
    const n = t.queryKey, r = t.queryHash ?? mt(n, t);
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
      (i) => Ft(t, i)
    );
  }
  findAll(e = {}) {
    const t = this.getAll();
    return Object.keys(e).length > 0 ? t.filter((i) => Ft(e, i)) : t;
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
    this.#e = e.queryCache || new An(), this.#t = e.mutationCache || new Fn(), this.#i = e.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = _t.subscribe(async (e) => {
      e && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = Ne.subscribe(async (e) => {
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
    return n === void 0 ? this.fetchQuery(e) : (e.revalidateIfStale && i.isStaleByTime(V(t.staleTime, i)) && this.prefetchQuery(t), Promise.resolve(n));
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
    return Promise.all(n).then(B).catch(B);
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
        return i.throwOnError || (s = s.catch(B)), r.state.fetchStatus === "paused" ? Promise.resolve() : s;
      })
    );
    return Promise.all(n).then(B);
  }
  fetchQuery(e) {
    const t = this.defaultQueryOptions(e);
    t.retry === void 0 && (t.retry = !1);
    const i = this.#e.build(this, t);
    return i.isStaleByTime(
      V(t.staleTime, i)
    ) ? i.fetch(t) : Promise.resolve(i.state.data);
  }
  prefetchQuery(e) {
    return this.fetchQuery(e).then(B).catch(B);
  }
  fetchInfiniteQuery(e) {
    return e.behavior = Nt(e.pages), this.fetchQuery(e);
  }
  prefetchInfiniteQuery(e) {
    return this.fetchInfiniteQuery(e).then(B).catch(B);
  }
  ensureInfiniteQueryData(e) {
    return e.behavior = Nt(e.pages), this.ensureQueryData(e);
  }
  resumePausedMutations() {
    return Ne.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
    this.#r.set(ie(e), {
      queryKey: e,
      defaultOptions: t
    });
  }
  getQueryDefaults(e) {
    const t = [...this.#r.values()], i = {};
    return t.forEach((n) => {
      ve(e, n.queryKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  setMutationDefaults(e, t) {
    this.#n.set(ie(e), {
      mutationKey: e,
      defaultOptions: t
    });
  }
  getMutationDefaults(e) {
    const t = [...this.#n.values()], i = {};
    return t.forEach((n) => {
      ve(e, n.mutationKey) && Object.assign(i, n.defaultOptions);
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
    return t.queryHash || (t.queryHash = mt(
      t.queryKey,
      t
    )), t.refetchOnReconnect === void 0 && (t.refetchOnReconnect = t.networkMode !== "always"), t.throwOnError === void 0 && (t.throwOnError = !!t.suspense), !t.networkMode && t.persister && (t.networkMode = "offlineFirst"), t.queryFn === gt && (t.enabled = !1), t;
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
}, ne, O, qe, Wt, Be = 0, Oi = [], M = w, Gt = M.__b, Qt = M.__r, jt = M.diffed, Kt = M.__c, qt = M.unmount, Vt = M.__;
function we(e, t) {
  M.__h && M.__h(O, e, Be || t), Be = 0;
  var i = O.__H || (O.__H = { __: [], __h: [] });
  return e >= i.__.length && i.__.push({}), i.__[e];
}
function E(e) {
  return Be = 1, Un(Ri, e);
}
function Un(e, t, i) {
  var n = we(ne++, 2);
  if (n.t = e, !n.__c && (n.__ = [i ? i(t) : Ri(void 0, t), function(l) {
    var u = n.__N ? n.__N[0] : n.__[0], c = n.t(u, l);
    u !== c && (n.__N = [c, n.__[1]], n.__c.setState({}));
  }], n.__c = O, !O.__f)) {
    var r = function(l, u, c) {
      if (!n.__c.__H) return !0;
      var h = n.__c.__H.__.filter(function(p) {
        return !!p.__c;
      });
      if (h.every(function(p) {
        return !p.__N;
      })) return !s || s.call(this, l, u, c);
      var d = n.__c.props !== l;
      return h.forEach(function(p) {
        if (p.__N) {
          var m = p.__[0];
          p.__ = p.__N, p.__N = void 0, m !== p.__[0] && (d = !0);
        }
      }), s && s.call(this, l, u, c) || d;
    };
    O.__f = !0;
    var s = O.shouldComponentUpdate, a = O.componentWillUpdate;
    O.componentWillUpdate = function(l, u, c) {
      if (this.__e) {
        var h = s;
        s = void 0, r(l, u, c), s = h;
      }
      a && a.call(this, l, u, c);
    }, O.shouldComponentUpdate = r;
  }
  return n.__N || n.__;
}
function $(e, t) {
  var i = we(ne++, 3);
  !M.__s && wt(i.__H, t) && (i.__ = e, i.u = t, O.__H.__h.push(i));
}
function zn(e, t) {
  var i = we(ne++, 4);
  !M.__s && wt(i.__H, t) && (i.__ = e, i.u = t, O.__h.push(i));
}
function Hn(e, t) {
  var i = we(ne++, 7);
  return wt(i.__H, t) && (i.__ = e(), i.__H = t, i.__h = e), i.__;
}
function ee(e, t) {
  return Be = 8, Hn(function() {
    return e;
  }, t);
}
function bt(e) {
  var t = O.context[e.__c], i = we(ne++, 9);
  return i.c = e, t ? (i.__ == null && (i.__ = !0, t.sub(O)), t.props.value) : e.__;
}
function $n() {
  for (var e; e = Oi.shift(); ) if (e.__P && e.__H) try {
    e.__H.__h.forEach(Me), e.__H.__h.forEach(ct), e.__H.__h = [];
  } catch (t) {
    e.__H.__h = [], M.__e(t, e.__v);
  }
}
M.__b = function(e) {
  O = null, Gt && Gt(e);
}, M.__ = function(e, t) {
  e && t.__k && t.__k.__m && (e.__m = t.__k.__m), Vt && Vt(e, t);
}, M.__r = function(e) {
  Qt && Qt(e), ne = 0;
  var t = (O = e.__c).__H;
  t && (qe === O ? (t.__h = [], O.__h = [], t.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (t.__h.forEach(Me), t.__h.forEach(ct), t.__h = [], ne = 0)), qe = O;
}, M.diffed = function(e) {
  jt && jt(e);
  var t = e.__c;
  t && t.__H && (t.__H.__h.length && (Oi.push(t) !== 1 && Wt === M.requestAnimationFrame || ((Wt = M.requestAnimationFrame) || Nn)($n)), t.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), qe = O = null;
}, M.__c = function(e, t) {
  t.some(function(i) {
    try {
      i.__h.forEach(Me), i.__h = i.__h.filter(function(n) {
        return !n.__ || ct(n);
      });
    } catch (n) {
      t.some(function(r) {
        r.__h && (r.__h = []);
      }), t = [], M.__e(n, i.__v);
    }
  }), Kt && Kt(e, t);
}, M.unmount = function(e) {
  qt && qt(e);
  var t, i = e.__c;
  i && i.__H && (i.__H.__.forEach(function(n) {
    try {
      Me(n);
    } catch (r) {
      t = r;
    }
  }), i.__H = void 0, t && M.__e(t, i.__v));
};
var Yt = typeof requestAnimationFrame == "function";
function Nn(e) {
  var t, i = function() {
    clearTimeout(n), Yt && cancelAnimationFrame(t), setTimeout(e);
  }, n = setTimeout(i, 35);
  Yt && (t = requestAnimationFrame(i));
}
function Me(e) {
  var t = O, i = e.__c;
  typeof i == "function" && (e.__c = void 0, i()), O = t;
}
function ct(e) {
  var t = O;
  e.__c = e.__(), O = t;
}
function wt(e, t) {
  return !e || e.length !== t.length || t.some(function(i, n) {
    return i !== e[n];
  });
}
function Ri(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function Bn(e, t) {
  for (var i in t) e[i] = t[i];
  return e;
}
function Xt(e, t) {
  for (var i in e) if (i !== "__source" && !(i in t)) return !0;
  for (var n in t) if (n !== "__source" && e[n] !== t[n]) return !0;
  return !1;
}
function Di(e, t) {
  var i = t(), n = E({ t: { __: i, u: t } }), r = n[0].t, s = n[1];
  return zn(function() {
    r.__ = i, r.u = t, Ve(r) && s({ t: r });
  }, [e, i, t]), $(function() {
    return Ve(r) && s({ t: r }), e(function() {
      Ve(r) && s({ t: r });
    });
  }, [e]), i;
}
function Ve(e) {
  var t, i, n = e.u, r = e.__;
  try {
    var s = n();
    return !((t = r) === (i = s) && (t !== 0 || 1 / t == 1 / i) || t != t && i != i);
  } catch {
    return !0;
  }
}
function Jt(e, t) {
  this.props = e, this.context = t;
}
(Jt.prototype = new q()).isPureReactComponent = !0, Jt.prototype.shouldComponentUpdate = function(e, t) {
  return Xt(this.props, e) || Xt(this.state, t);
};
var Zt = w.__b;
w.__b = function(e) {
  e.type && e.type.__f && e.ref && (e.props.ref = e.ref, e.ref = null), Zt && Zt(e);
};
var Wn = w.__e;
w.__e = function(e, t, i, n) {
  if (e.then) {
    for (var r, s = t; s = s.__; ) if ((r = s.__c) && r.__c) return t.__e == null && (t.__e = i.__e, t.__k = i.__k), r.__c(e, t);
  }
  Wn(e, t, i, n);
};
var ei = w.unmount;
function Fi(e, t, i) {
  return e && (e.__c && e.__c.__H && (e.__c.__H.__.forEach(function(n) {
    typeof n.__c == "function" && n.__c();
  }), e.__c.__H = null), (e = Bn({}, e)).__c != null && (e.__c.__P === i && (e.__c.__P = t), e.__c.__e = !0, e.__c = null), e.__k = e.__k && e.__k.map(function(n) {
    return Fi(n, t, i);
  })), e;
}
function Mi(e, t, i) {
  return e && i && (e.__v = null, e.__k = e.__k && e.__k.map(function(n) {
    return Mi(n, t, i);
  }), e.__c && e.__c.__P === t && (e.__e && i.appendChild(e.__e), e.__c.__e = !0, e.__c.__P = i)), e;
}
function Ye() {
  this.__u = 0, this.o = null, this.__b = null;
}
function Ai(e) {
  if (!e.__) return null;
  var t = e.__.__c;
  return t && t.__a && t.__a(e);
}
function Pe() {
  this.i = null, this.l = null;
}
w.unmount = function(e) {
  var t = e.__c;
  t && (t.__z = !0), t && t.__R && t.__R(), t && 32 & e.__u && (e.type = null), ei && ei(e);
}, (Ye.prototype = new q()).__c = function(e, t) {
  var i = t.__c, n = this;
  n.o == null && (n.o = []), n.o.push(i);
  var r = Ai(n.__v), s = !1, a = function() {
    s || n.__z || (s = !0, i.__R = null, r ? r(u) : u());
  };
  i.__R = a;
  var l = i.__P;
  i.__P = null;
  var u = function() {
    if (!--n.__u) {
      if (n.state.__a) {
        var c = n.state.__a;
        n.__v.__k[0] = Mi(c, c.__c.__P, c.__c.__O);
      }
      var h;
      for (n.setState({ __a: n.__b = null }); h = n.o.pop(); ) h.__P = l, h.forceUpdate();
    }
  };
  n.__u++ || 32 & t.__u || n.setState({ __a: n.__b = n.__v.__k[0] }), e.then(a, a);
}, Ye.prototype.componentWillUnmount = function() {
  this.o = [];
}, Ye.prototype.render = function(e, t) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), n = this.__v.__k[0].__c;
      this.__v.__k[0] = Fi(this.__b, i, n.__O = n.__P);
    }
    this.__b = null;
  }
  var r = t.__a && et(X, null, e.fallback);
  return r && (r.__u &= -33), [et(X, null, t.__a ? null : e.children), r];
};
var ti = function(e, t, i) {
  if (++i[1] === i[0] && e.l.delete(t), e.props.revealOrder && (e.props.revealOrder[0] !== "t" || !e.l.size)) for (i = e.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    e.i = i = i[2];
  }
};
(Pe.prototype = new q()).__a = function(e) {
  var t = this, i = Ai(t.__v), n = t.l.get(e);
  return n[0]++, function(r) {
    var s = function() {
      t.props.revealOrder ? (n.push(r), ti(t, e, n)) : r();
    };
    i ? i(s) : s();
  };
}, Pe.prototype.render = function(e) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var t = He(e.children);
  e.revealOrder && e.revealOrder[0] === "b" && t.reverse();
  for (var i = t.length; i--; ) this.l.set(t[i], this.i = [1, 0, this.i]);
  return e.children;
}, Pe.prototype.componentDidUpdate = Pe.prototype.componentDidMount = function() {
  var e = this;
  this.l.forEach(function(t, i) {
    ti(e, i, t);
  });
};
var Gn = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, Qn = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, jn = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, Kn = /[A-Z0-9]/g, qn = typeof document < "u", Vn = function(e) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(e);
};
q.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(e) {
  Object.defineProperty(q.prototype, e, { configurable: !0, get: function() {
    return this["UNSAFE_" + e];
  }, set: function(t) {
    Object.defineProperty(this, e, { configurable: !0, writable: !0, value: t });
  } });
});
var ii = w.event;
function Yn() {
}
function Xn() {
  return this.cancelBubble;
}
function Jn() {
  return this.defaultPrevented;
}
w.event = function(e) {
  return ii && (e = ii(e)), e.persist = Yn, e.isPropagationStopped = Xn, e.isDefaultPrevented = Jn, e.nativeEvent = e;
};
var Zn = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, ni = w.vnode;
w.vnode = function(e) {
  typeof e.type == "string" && (function(t) {
    var i = t.props, n = t.type, r = {}, s = n.indexOf("-") === -1;
    for (var a in i) {
      var l = i[a];
      if (!(a === "value" && "defaultValue" in i && l == null || qn && a === "children" && n === "noscript" || a === "class" || a === "className")) {
        var u = a.toLowerCase();
        a === "defaultValue" && "value" in i && i.value == null ? a = "value" : a === "download" && l === !0 ? l = "" : u === "translate" && l === "no" ? l = !1 : u[0] === "o" && u[1] === "n" ? u === "ondoubleclick" ? a = "ondblclick" : u !== "onchange" || n !== "input" && n !== "textarea" || Vn(i.type) ? u === "onfocus" ? a = "onfocusin" : u === "onblur" ? a = "onfocusout" : jn.test(a) && (a = u) : u = a = "oninput" : s && Qn.test(a) ? a = a.replace(Kn, "-$&").toLowerCase() : l === null && (l = void 0), u === "oninput" && r[a = u] && (a = "oninputCapture"), r[a] = l;
      }
    }
    n == "select" && r.multiple && Array.isArray(r.value) && (r.value = He(i.children).forEach(function(c) {
      c.props.selected = r.value.indexOf(c.props.value) != -1;
    })), n == "select" && r.defaultValue != null && (r.value = He(i.children).forEach(function(c) {
      c.props.selected = r.multiple ? r.defaultValue.indexOf(c.props.value) != -1 : r.defaultValue == c.props.value;
    })), i.class && !i.className ? (r.class = i.class, Object.defineProperty(r, "className", Zn)) : (i.className && !i.class || i.class && i.className) && (r.class = r.className = i.className), t.props = r;
  })(e), e.$$typeof = Gn, ni && ni(e);
};
var ri = w.__r;
w.__r = function(e) {
  ri && ri(e), e.__c;
};
var si = w.diffed;
w.diffed = function(e) {
  si && si(e);
  var t = e.props, i = e.__e;
  i != null && e.type === "textarea" && "value" in t && t.value !== i.value && (i.value = t.value == null ? "" : t.value);
};
var Li = pt(
  void 0
), St = (e) => {
  const t = bt(Li);
  if (!t)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return t;
}, er = ({
  client: e,
  children: t
}) => ($(() => (e.mount(), () => {
  e.unmount();
}), [e]), /* @__PURE__ */ o(Li.Provider, { value: e, children: t })), Ui = pt(!1), tr = () => bt(Ui);
Ui.Provider;
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
var nr = pt(ir()), rr = () => bt(nr), sr = (e, t, i) => {
  const n = i?.state.error && typeof e.throwOnError == "function" ? yt(e.throwOnError, [i.state.error, i]) : e.throwOnError;
  (e.suspense || e.experimental_prefetchInRender || n) && (t.isReset() || (e.retryOnMount = !1));
}, or = (e) => {
  $(() => {
    e.clearReset();
  }, [e]);
}, ar = ({
  result: e,
  errorResetBoundary: t,
  throwOnError: i,
  query: n,
  suspense: r
}) => e.isError && !t.isReset() && !e.isFetching && n && (r && e.data === void 0 || yt(i, [e.error, n])), lr = (e) => {
  if (e.suspense) {
    const i = (r) => r === "static" ? r : Math.max(r ?? 1e3, 1e3), n = e.staleTime;
    e.staleTime = typeof n == "function" ? (...r) => i(n(...r)) : i(n), typeof e.gcTime == "number" && (e.gcTime = Math.max(
      e.gcTime,
      1e3
    ));
  }
}, cr = (e, t) => e.isLoading && e.isFetching && !t, dr = (e, t) => e?.suspense && t.isPending, oi = (e, t, i) => t.fetchOptimistic(e).catch(() => {
  i.clearReset();
});
function ur(e, t, i) {
  const n = tr(), r = rr(), s = St(), a = s.defaultQueryOptions(e);
  s.getDefaultOptions().queries?._experimental_beforeQuery?.(
    a
  );
  const l = s.getQueryCache().get(a.queryHash);
  a._optimisticResults = n ? "isRestoring" : "optimistic", lr(a), sr(a, r, l), or(r);
  const u = !s.getQueryCache().get(a.queryHash), [c] = E(
    () => new t(
      s,
      a
    )
  ), h = c.getOptimisticResult(a), d = !n && e.subscribed !== !1;
  if (Di(
    ee(
      (p) => {
        const m = d ? c.subscribe(A.batchCalls(p)) : B;
        return c.updateResult(), m;
      },
      [c, d]
    ),
    () => c.getCurrentResult()
  ), $(() => {
    c.setOptions(a);
  }, [a, c]), dr(a, h))
    throw oi(a, c, r);
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
  ), a.experimental_prefetchInRender && !te && cr(h, n) && (u ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    oi(a, c, r)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    l?.promise
  ))?.catch(B).finally(() => {
    c.updateResult();
  }), a.notifyOnChangeProps ? h : c.trackResult(h);
}
function zi(e, t) {
  return ur(e, Pn);
}
function Et(e, t) {
  const i = St(), [n] = E(
    () => new Mn(
      i,
      e
    )
  );
  $(() => {
    n.setOptions(e);
  }, [n, e]);
  const r = Di(
    ee(
      (a) => n.subscribe(A.batchCalls(a)),
      [n]
    ),
    () => n.getCurrentResult()
  ), s = ee(
    (a, l) => {
      n.mutate(a, l).catch(B);
    },
    [n]
  );
  if (r.error && yt(n.options.throwOnError, [r.error]))
    throw r.error;
  return { ...r, mutate: s, mutateAsync: r.mutate };
}
const Q = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif", f = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "100%",
    minHeight: "100%",
    fontFamily: Q
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
    fontFamily: Q
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
    fontFamily: Q
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
    fontFamily: Q
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: Q
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
    fontFamily: Q,
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
    fontFamily: Q
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
    fontFamily: Q
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
* { font-family: ${Q}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function I({
  variant: e,
  children: t,
  onClick: i,
  type: n = "button",
  title: r,
  active: s = !1,
  style: a,
  class: l,
  disabled: u,
  "aria-label": c
}) {
  const h = e === "primary" ? f.primaryBtn : e === "secondary" ? f.secondaryBtn : e === "icon" ? f.iconBtn : e === "iconSm" ? f.iconBtnSm : e === "placement" ? f.placementBtn(s) : {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.25rem",
    fontFamily: Q
  }, d = a ? { ...h, ...a } : h;
  return /* @__PURE__ */ o(
    "button",
    {
      type: n,
      style: d,
      class: l,
      onClick: i,
      title: r,
      disabled: u,
      "aria-label": c,
      children: t
    }
  );
}
function Ae({
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
function xt({
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
  const [i, n] = E(""), [r, s] = E(null), [a, l] = E(""), [u, c] = E("right"), [h, d] = E(""), [p, m] = E(!1);
  $(() => {
    e({ type: "EDITOR_READY" });
  }, []), $(() => {
    t ? (n(t.selector), s(t.elementInfo), m(!0), l(""), d("")) : (n(""), s(null), m(!1), l(""), d(""));
  }, [t]);
  const v = () => {
    const g = a.trim();
    if (!g) {
      d("Please enter guide content");
      return;
    }
    if (!i) {
      d("No element selected");
      return;
    }
    d(""), e({
      type: "SAVE_GUIDE",
      guide: {
        page: Ue(),
        selector: i,
        content: g,
        placement: u,
        status: "active"
      }
    });
  }, _ = () => {
    n(""), s(null), m(!1), l(""), d(""), e({ type: "CLEAR_SELECTION_CLICKED" });
  }, b = (g) => {
    const y = [];
    return g.tagName && y.push(`Tag: ${g.tagName}`), g.id && y.push(`ID: ${g.id}`), g.className && y.push(`Class: ${g.className}`), g.textContent && y.push(`Text: ${g.textContent}`), y.join(" | ");
  };
  return /* @__PURE__ */ o("div", { style: f.root, children: [
    /* @__PURE__ */ o("div", { style: f.header, children: [
      /* @__PURE__ */ o("h2", { style: f.headerTitle, children: "Create Guide" }),
      /* @__PURE__ */ o(I, { variant: "icon", onClick: () => e({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    p ? /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ o("div", { style: f.section, children: [
        /* @__PURE__ */ o("label", { style: f.label, children: "Selector" }),
        /* @__PURE__ */ o("div", { style: f.selectorBox, children: i || "-" })
      ] }),
      r && /* @__PURE__ */ o("div", { style: f.elementInfo, children: [
        /* @__PURE__ */ o("strong", { style: f.elementInfoTitle, children: "Element Info" }),
        /* @__PURE__ */ o("div", { style: f.elementInfoText, children: b(r) })
      ] }),
      /* @__PURE__ */ o("div", { style: f.section, children: [
        /* @__PURE__ */ o("label", { for: "guideContent", style: f.label, children: "Guide Content" }),
        /* @__PURE__ */ o(
          xt,
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
          I,
          {
            variant: "placement",
            active: u === g,
            onClick: () => c(g),
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
        /* @__PURE__ */ o(I, { variant: "secondary", onClick: () => e({ type: "CANCEL" }), children: "Cancel" }),
        /* @__PURE__ */ o(I, { variant: "secondary", onClick: _, children: "Clear Selection" }),
        /* @__PURE__ */ o(I, { variant: "primary", style: { flex: 1 }, onClick: v, children: "Save Guide" })
      ] })
    ] }) : /* @__PURE__ */ o("div", { style: f.emptyState, children: [
      /* @__PURE__ */ o("div", { style: f.emptyStateIcon, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:cursor-default-click", style: { fontSize: "1.875rem", color: "#3b82f6" } }) }),
      /* @__PURE__ */ o("p", { style: f.emptyStateText, children: "Click on an element in the page to create a guide" }),
      /* @__PURE__ */ o(I, { variant: "primary", onClick: () => e({ type: "ACTIVATE_SELECTOR" }), children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:selection-marker" }),
        "Select element"
      ] })
    ] })
  ] });
}
const mr = "https://devgw.revgain.ai/rg-pex", Hi = "designerIud";
function gr() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(Hi);
  } catch {
    return null;
  }
}
function Ie(e) {
  const t = {
    "Content-Type": "application/json",
    ...e
  }, i = gr();
  return i && (t.iud = i), t;
}
const re = {
  baseUrl: mr,
  async get(e, t) {
    const i = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, n = await fetch(i, {
      ...t,
      headers: { ...Ie(), ...t?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  },
  async post(e, t, i) {
    const n = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, r = await fetch(n, {
      method: "POST",
      ...i,
      headers: { ...Ie(), ...i?.headers },
      body: t !== void 0 ? JSON.stringify(t) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async put(e, t, i) {
    const n = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, r = await fetch(n, {
      method: "PUT",
      ...i,
      headers: { ...Ie(), ...i?.headers },
      body: t !== void 0 ? JSON.stringify(t) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async delete(e, t) {
    const i = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, n = await fetch(i, {
      method: "DELETE",
      ...t,
      headers: { ...Ie(), ...t?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  }
}, yr = ["pages", "create"];
async function _r(e) {
  return re.post("/pages", {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: "active"
  });
}
function vr() {
  return Et({
    mutationKey: yr,
    mutationFn: _r
  });
}
const br = ["pages", "update"];
async function wr({ pageId: e, payload: t }) {
  return re.put(`/pages/${e}`, {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: t.status ?? "active"
  });
}
function Sr() {
  return Et({
    mutationKey: br,
    mutationFn: wr
  });
}
const Er = ["pages", "delete"];
async function xr(e) {
  return re.delete(`/pages/${e}`);
}
function Cr() {
  return Et({
    mutationKey: Er,
    mutationFn: xr
  });
}
const kr = (e) => ["pages", "check-slug", e];
async function Tr(e) {
  return re.get(`/pages/check-slug?slug=${encodeURIComponent(e)}`);
}
function Pr(e) {
  return zi({
    queryKey: kr(e),
    queryFn: () => Tr(e),
    enabled: !!e,
    retry: 0
  });
}
const Ir = ["pages", "list"];
async function Or() {
  return re.get("/pages");
}
function Rr() {
  return zi({
    queryKey: Ir,
    queryFn: Or,
    retry: 0
  });
}
const Dr = "designerTaggedPages", Oe = ["pages", "check-slug"], Xe = ["pages", "list"];
function Re() {
  try {
    const t = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (t.host || t.hostname || "") + (t.pathname || "/") + (t.search || "") + (t.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function De() {
  try {
    const t = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (t.pathname || "/").replace(/^\//, ""), n = t.search || "", r = t.hash || "";
    return "//*/" + i + n + r;
  } catch {
    return "//*/";
  }
}
function Fr({ onMessage: e }) {
  const [t, i] = E("overviewUntagged"), [n, r] = E(""), [s, a] = E(""), [l, u] = E(""), [c, h] = E(!1), [d, p] = E("create"), [m, v] = E(""), [_, b] = E(""), [g, y] = E("suggested"), [P, R] = E(""), [L, z] = E(!1), [D, k] = E(null), [F, H] = E(!1), T = St(), U = vr(), G = Sr(), Se = Cr(), { data: se, isLoading: oe, isError: he } = Pr(n), { data: Ge, isLoading: Ee } = Rr(), fe = !!n && oe, C = U.isPending || G.isPending, j = (n || "").trim().toLowerCase(), pe = (Ge?.data ?? []).filter((x) => (x.slug || "").trim().toLowerCase() === j).filter(
    (x) => (x.name || "").toLowerCase().includes(l.toLowerCase().trim())
  ), xe = ee(() => {
    i("overviewUntagged"), a(Re() || "(current page)"), h(!1), T.invalidateQueries({ queryKey: Oe });
  }, [T]), Gi = ee(() => {
    i("taggedPagesDetailView"), u("");
  }, []), Qe = ee(() => {
    k(null), i("tagPageFormView"), h(!0), R(De()), v(""), b(""), p("create"), y("suggested"), z(!1);
  }, []), Qi = ee((x) => {
    k(x.page_id), i("tagPageFormView"), h(!0), R(x.slug || De()), v(x.name || ""), b(x.description || ""), p("create"), y("suggested"), z(!1);
  }, []);
  $(() => {
    e({ type: "EDITOR_READY" });
  }, []), $(() => {
    r(De()), a(Re() || "(current page)");
  }, []), $(() => {
    if (!n) {
      i("overviewUntagged");
      return;
    }
    if (he) {
      (t === "overviewTagged" || t === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    se !== void 0 && (t === "overviewTagged" || t === "overviewUntagged") && i(se.exists ? "overviewTagged" : "overviewUntagged");
  }, [n, se, he, t]), $(() => {
    let x = Re();
    const ge = () => {
      const le = Re();
      le !== x && (x = le, r(De()), a(le || "(current page)"), i("overviewUntagged"));
    }, ye = () => ge(), Ce = () => ge();
    window.addEventListener("hashchange", ye), window.addEventListener("popstate", Ce);
    const je = setInterval(ge, 1500);
    return () => {
      window.removeEventListener("hashchange", ye), window.removeEventListener("popstate", Ce), clearInterval(je);
    };
  }, []);
  const ji = async () => {
    const x = m.trim();
    if (!x) {
      z(!0);
      return;
    }
    z(!1);
    const ge = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, ye = P.trim() || ge || "/";
    try {
      if (D)
        await G.mutateAsync({
          pageId: D,
          payload: {
            name: x,
            slug: ye,
            description: _.trim() || void 0,
            status: "active"
          }
        }), k(null), T.invalidateQueries({ queryKey: Oe }), T.invalidateQueries({ queryKey: Xe }), xe();
      else {
        const Ce = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, je = P.trim() || Ce;
        await U.mutateAsync({
          name: x,
          slug: ye,
          description: _.trim() || void 0
        });
        const le = Dr, qi = localStorage.getItem(le) || "[]", Ct = JSON.parse(qi);
        Ct.push({ pageName: x, url: je }), localStorage.setItem(le, JSON.stringify(Ct)), T.invalidateQueries({ queryKey: Oe }), T.invalidateQueries({ queryKey: Xe }), i("overviewTagged"), h(!1);
      }
    } catch {
    }
  }, Ki = async (x) => {
    if (window.confirm("Delete this page?"))
      try {
        await Se.mutateAsync(x), T.invalidateQueries({ queryKey: Oe }), T.invalidateQueries({ queryKey: Xe });
      } catch {
      }
  }, me = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return F ? /* @__PURE__ */ o("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(I, { variant: "icon", title: "Expand", onClick: () => H(!1), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ o("div", { style: f.panel, children: [
    /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(I, { variant: "icon", title: "Minimize", onClick: () => H(!0), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ o("div", { style: f.panelBody, children: [
      fe && (t === "overviewTagged" || t === "overviewUntagged") && /* @__PURE__ */ o("div", { style: { ...me, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ o("span", { children: "Checking page…" })
      ] }),
      !fe && t === "overviewTagged" && /* @__PURE__ */ o("div", { style: me, children: [
        /* @__PURE__ */ o("div", { style: f.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ o("div", { style: { ...f.card, marginBottom: "1rem", cursor: "pointer" }, onClick: Gi, children: /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ o("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ o("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ o("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ o("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: s })
            ] })
          ] }),
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ o(I, { variant: "primary", style: { width: "100%" }, onClick: Qe, children: "Tag Page" })
      ] }),
      t === "taggedPagesDetailView" && /* @__PURE__ */ o("div", { style: me, children: [
        /* @__PURE__ */ o(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (x) => {
              x.preventDefault(), xe();
            },
            children: [
              /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: Ee ? "…" : pe.length }),
          /* @__PURE__ */ o("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ o("div", { style: f.searchWrap, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
          /* @__PURE__ */ o(
            Ae,
            {
              type: "text",
              placeholder: "Search Pages",
              value: l,
              onInput: (x) => u(x.target.value),
              style: f.searchInput
            }
          ),
          l && /* @__PURE__ */ o(I, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => u(""), children: "Clear" })
        ] }),
        Ee ? /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ o("span", { children: "Loading pages…" })
        ] }) : pe.map((x) => /* @__PURE__ */ o("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: x.name || "Unnamed" }),
          /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ o(I, { variant: "iconSm", title: "Edit", onClick: () => Qi(x), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ o(I, { variant: "iconSm", title: "Delete", onClick: () => Ki(x.page_id), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, x.page_id)),
        /* @__PURE__ */ o(I, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: Qe, children: "Tag Page" })
      ] }),
      !fe && t === "overviewUntagged" && /* @__PURE__ */ o("div", { style: { ...me, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ o("div", { style: { ...f.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ o("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ o(I, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: Qe, children: "Tag Page" })
      ] }),
      t === "tagPageFormView" && /* @__PURE__ */ o("div", { style: { ...me, gap: "1.5rem" }, children: [
        /* @__PURE__ */ o(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (x) => {
              x.preventDefault(), k(null), xe(), h(!1);
            },
            children: [
              /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back"
            ]
          }
        ),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ o("div", { style: f.sectionLabel, children: D ? "EDIT PAGE" : "PAGE SETUP" }),
          !D && /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "pageSetup", value: "create", checked: d === "create", onChange: () => p("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create New Page" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "pageSetup", value: "merge", checked: d === "merge", onChange: () => p("merge"), style: { accentColor: "#3b82f6" } }),
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
                Ae,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: m,
                  onInput: (x) => v(x.target.value)
                }
              ),
              L && /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ o("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ o("div", { children: [
              /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ o(
                xt,
                {
                  placeholder: "Click to add description",
                  value: _,
                  onInput: (x) => b(x.target.value),
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
            /* @__PURE__ */ o(I, { variant: "iconSm", children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "ruleType", value: "suggested", checked: g === "suggested", onChange: () => y("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "ruleType", value: "exact", checked: g === "exact", onChange: () => y("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "ruleType", value: "builder", checked: g === "builder", onChange: () => y("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ o("div", { children: [
            /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ o(Ae, { type: "text", placeholder: "e.g. //*/path/to/page", value: P, onInput: (x) => R(x.target.value) })
          ] })
        ] })
      ] })
    ] }),
    c && /* @__PURE__ */ o("div", { style: f.footer, children: [
      /* @__PURE__ */ o(
        I,
        {
          variant: "secondary",
          onClick: () => {
            k(null), xe();
          },
          disabled: C,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ o(I, { variant: "primary", style: { flex: 1 }, onClick: ji, disabled: C, children: C ? /* @__PURE__ */ o(X, { children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        D ? "Updating…" : "Saving…"
      ] }) : D ? "Update" : "Save" })
    ] })
  ] });
}
const Mr = "designerTaggedFeatures", ai = "designerHeatmapEnabled";
function Ar() {
  try {
    const e = window.location;
    return (e.host || e.hostname || "") + (e.pathname || "/") + (e.search || "") + (e.hash || "");
  } catch {
    return window.location.href || "";
  }
}
function li(e) {
  return (e || "").replace(/^https?:\/\//i, "").replace(/\/$/, "") || "";
}
function Lr() {
  try {
    const e = localStorage.getItem(Mr) || "[]";
    return JSON.parse(e);
  } catch {
    return [];
  }
}
function Ur() {
  const e = li(Ar());
  return Lr().filter((t) => t && li(t.url) === e);
}
function zr({ onMessage: e, elementSelected: t, tagFeatureSavedAckCounter: i }) {
  const [n, r] = E(!1), [s, a] = E(""), [l, u] = E(null), [c, h] = E(""), [d, p] = E(!1), [m, v] = E(0), [_, b] = E(!1), [g, y] = E(!1), [P, R] = E(!1), [L, z] = E(!1), [D, k] = E("create"), [F, H] = E("suggested"), [T, U] = E(""), [G, Se] = E(""), se = () => {
    v(Ur().length);
  }, oe = () => {
    r(!1), a(""), u(null), Se(""), h(""), p(!1), se();
  };
  $(() => {
    e({ type: "EDITOR_READY" });
  }, []), $(() => {
    se();
  }, []), $(() => {
    const C = localStorage.getItem(ai) === "true";
    b(C);
  }, []), $(() => {
    t ? (a(t.selector), u(t.elementInfo), Se(t.xpath || ""), r(!0), h(""), p(!1), k("create"), U("")) : oe();
  }, [t]), $(() => {
    i != null && i > 0 && oe();
  }, [i]);
  const he = () => {
    const C = !_;
    b(C);
    try {
      localStorage.setItem(ai, String(C));
    } catch {
    }
    e({ type: "HEATMAP_TOGGLE", enabled: C });
  }, Ge = (C) => C.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""), Ee = () => {
    const C = c.trim();
    if (!C) {
      p(!0);
      return;
    }
    p(!1);
    const j = s || t?.selector || "", ae = G || t?.xpath || "";
    if (F === "exact") {
      if (!ae) return;
      const pe = {
        name: C,
        slug: Ge(C),
        description: T.trim() || "",
        status: "active",
        rules: [
          {
            selector_type: "xpath",
            selector_value: ae,
            match_mode: "exact",
            priority: 10,
            is_active: !0
          }
        ]
      };
      console.log("Tag Feature payload (exact match):", pe), e({ type: "SAVE_TAG_FEATURE", payload: pe });
      return;
    }
    e({
      type: "SAVE_TAG_FEATURE",
      payload: {
        featureName: C,
        description: T.trim() || void 0,
        selector: j,
        elementInfo: l || void 0
      }
    });
  }, fe = (C) => {
    const j = [];
    C.tagName && j.push(`Tag: ${C.tagName}`), C.id && j.push(`ID: ${C.id}`), C.className && j.push(`Class: ${C.className}`);
    const ae = (C.textContent || "").slice(0, 80);
    return ae && j.push(`Text: ${ae}`), j.join(" | ");
  };
  return g ? /* @__PURE__ */ o("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: n ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(I, { variant: "icon", title: "Expand", onClick: () => y(!1), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ o("div", { style: f.panel, children: [
    /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(I, { variant: "icon", title: "Minimize", onClick: () => y(!0), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ o("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: n ? /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ o("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ o("a", { href: "#", style: f.link, onClick: (C) => {
          C.preventDefault(), oe();
        }, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ o("div", { children: [
          /* @__PURE__ */ o("div", { style: f.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureSetup", checked: D === "create", onChange: () => k("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureSetup", checked: D === "merge", onChange: () => k("merge"), style: { accentColor: "#3b82f6" } }),
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
                Ae,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: c,
                  onInput: (C) => h(C.target.value)
                }
              ),
              d && /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ o("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a feature name."
              ] })
            ] }),
            /* @__PURE__ */ o("div", { children: [
              /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ o(
                xt,
                {
                  placeholder: "Describe your Feature",
                  value: T,
                  onInput: (C) => U(C.target.value),
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
              /* @__PURE__ */ o("input", { type: "radio", name: "featureMatch", checked: F === "suggested", onChange: () => H("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureMatch", checked: F === "ruleBuilder", onChange: () => H("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureMatch", checked: F === "customCss", onChange: () => H("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ o("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ o("input", { type: "radio", name: "featureMatch", checked: F === "exact", onChange: () => H("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ o("div", { children: [
            /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: F === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ o("div", { style: f.selectorBox, children: F === "exact" ? (t?.xpath ?? G) || "-" : (t?.selector ?? s) || "-" })
          ] }),
          l && /* @__PURE__ */ o("div", { style: { marginTop: "1rem" }, children: [
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
                onClick: () => z((C) => !C),
                "aria-expanded": L,
                children: [
                  /* @__PURE__ */ o("label", { style: { ...f.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                  /* @__PURE__ */ o(
                    "iconify-icon",
                    {
                      icon: L ? "mdi:chevron-up" : "mdi:chevron-down",
                      style: { fontSize: "1.125rem", color: "#64748b", flexShrink: 0 }
                    }
                  )
                ]
              }
            ),
            L && /* @__PURE__ */ o("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ o("div", { style: f.elementInfoText, children: fe(l) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ o("div", { style: f.footer, children: [
        /* @__PURE__ */ o(I, { variant: "secondary", onClick: oe, children: "Cancel" }),
        /* @__PURE__ */ o(I, { variant: "primary", style: { flex: 1 }, onClick: Ee, children: "Save" })
      ] })
    ] }) : /* @__PURE__ */ o("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
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
      /* @__PURE__ */ o("div", { style: { ...f.card, marginBottom: "0.75rem" }, children: /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ o("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: m }),
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
              style: f.toggle(_),
              onClick: he,
              onKeyDown: (C) => C.key === "Enter" && he(),
              children: /* @__PURE__ */ o("span", { style: f.toggleThumb(_) })
            }
          ),
          /* @__PURE__ */ o(I, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ o(
          I,
          {
            variant: P ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              R(!0), e({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Tag Feature"
          }
        ),
        /* @__PURE__ */ o(
          I,
          {
            variant: "secondary",
            style: P ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              R(!1), e({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Clear Selection"
          }
        )
      ] })
    ] }) })
  ] });
}
const Hr = new Ln({
  defaultOptions: { mutations: { retry: 0 } }
});
class $r {
  iframe = null;
  dragHandle = null;
  gripButton = null;
  messageCallback = null;
  isReady = !1;
  mode = null;
  elementSelectedState = null;
  tagPageSavedAckCounter = 0;
  tagFeatureSavedAckCounter = 0;
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
  sendTagFeatureSavedAck() {
    this.tagFeatureSavedAckCounter += 1, this.renderEditorContent();
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
    const n = (s) => this.messageCallback?.(s), r = this.mode === "tag-page" ? /* @__PURE__ */ o(Fr, { onMessage: n }) : this.mode === "tag-feature" ? /* @__PURE__ */ o(
      zr,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState,
        tagFeatureSavedAckCounter: this.tagFeatureSavedAckCounter
      }
    ) : /* @__PURE__ */ o(
      pr,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    );
    de(
      /* @__PURE__ */ o(er, { client: Hr, children: r }),
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
      const c = Math.abs(t.clientX - this.mouseDownX), h = Math.abs(t.clientY - this.mouseDownY);
      if (Math.sqrt(c * c + h * h) > this.dragThreshold)
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
const Nr = "visual-designer-guides", ci = "1.0.0";
class Br {
  storageKey;
  constructor(t = Nr) {
    this.storageKey = t;
  }
  getGuides() {
    try {
      const t = localStorage.getItem(this.storageKey);
      if (!t) return [];
      const i = JSON.parse(t);
      return i.version !== ci ? (this.clear(), []) : i.guides || [];
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
    const i = { guides: t, version: ci };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(t) {
    return this.getGuides().find((i) => i.id === t) || null;
  }
}
function Wr({ onExit: e }) {
  const t = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: S.bg,
    border: `2px solid ${S.primary}`,
    borderRadius: S.borderRadius,
    color: S.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: S.fontFamily,
    cursor: "pointer",
    zIndex: String(S.zIndex.controls),
    boxShadow: S.shadow,
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
        i.currentTarget.style.background = S.primary, i.currentTarget.style.color = S.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = S.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = S.bg, i.currentTarget.style.color = S.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = S.shadow;
      },
      children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function Gr() {
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
        border: `5px solid ${S.primary}`,
        pointerEvents: "none",
        zIndex: S.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function Qr() {
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
        background: S.primary,
        color: S.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: S.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${S.primary}`,
        borderTop: "none",
        zIndex: S.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function jr() {
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
        zIndex: S.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: S.fontFamily
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
                    borderTopColor: S.primary,
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
function Kr(e) {
  return /* @__PURE__ */ o(X, { children: [
    e.showExitButton && /* @__PURE__ */ o(Wr, { onExit: e.onExitEditor }),
    e.showRedBorder && /* @__PURE__ */ o(Gr, {}),
    e.showBadge && /* @__PURE__ */ o(Qr, {}),
    e.showLoading && /* @__PURE__ */ o(jr, {})
  ] });
}
function qr(e, t) {
  de(/* @__PURE__ */ o(Kr, { ...t }), e);
}
class $i {
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
  constructor(t = {}) {
    this.config = t, this.storage = new Br(t.storageKey), this.editorMode = new Ji(), this.guideRenderer = new cn(), this.featureHeatmapRenderer = new hn(), this.editorFrame = new $r();
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
    return this.storage.getGuidesByPage(Ue());
  }
  saveGuide(t) {
    const i = {
      ...t,
      id: Ke(),
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
      case "SAVE_TAG_FEATURE":
        this.handleSaveTagFeature(t);
        break;
      case "HEATMAP_TOGGLE":
        this.handleHeatmapToggle(t.enabled);
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
      page: Ue()
    });
  }
  async handleSaveTagFeature(t) {
    const i = "designerTaggedFeatures", n = t.payload, r = typeof window < "u" ? window.location.href : "";
    try {
      const s = localStorage.getItem(i) || "[]", a = JSON.parse(s);
      if ("rules" in n && Array.isArray(n.rules) && n.rules[0]?.selector_type === "xpath") {
        const l = n;
        if (!l.name || !l.rules[0].selector_value) return;
        try {
          await re.post("/features", l);
        } catch (u) {
          console.warn("[Visual Designer] POST /features failed:", u);
        }
        a.push({ ...l, url: r });
      } else {
        const l = n;
        if (!l.selector || !l.featureName) return;
        const u = {
          id: Ke(),
          featureName: l.featureName,
          selector: l.selector,
          url: r,
          elementInfo: l.elementInfo,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        a.push(u);
      }
      localStorage.setItem(i, JSON.stringify(a)), this.editorFrame.sendTagFeatureSavedAck(), this.renderFeatureHeatmap();
    } catch {
    }
  }
  handleHeatmapToggle(t) {
    this.heatmapEnabled = t;
    try {
      localStorage.setItem("designerHeatmapEnabled", String(t));
    } catch {
    }
    this.renderFeatureHeatmap();
  }
  getTaggedFeatures() {
    try {
      const t = localStorage.getItem("designerTaggedFeatures") || "[]";
      return JSON.parse(t).filter((n) => n != null && typeof n == "object").map((n) => {
        if ("rules" in n && Array.isArray(n.rules) && n.rules[0] && n.rules[0].selector_type === "xpath") {
          const r = n, s = r.rules[0].selector_value;
          return {
            id: Ke(),
            featureName: r.name,
            selector: s,
            url: r.url || "",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
        }
        return "selector" in n && "featureName" in n ? n : null;
      }).filter((n) => n != null);
    } catch {
      return [];
    }
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
    this.ensureSDKRoot(), this.sdkRoot && qr(this.sdkRoot, {
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
let N = null, Ni = !1;
function Y(e) {
  return N || (N = new $i(e), N.init(), N);
}
function Bi() {
  return N;
}
function Wi(e) {
  !e || !Array.isArray(e) || e.forEach((t) => {
    if (!t || !Array.isArray(t) || t.length === 0) return;
    const i = t[0], n = t.slice(1);
    try {
      switch (i) {
        case "initialize":
          Y(n[0]);
          break;
        case "identify":
          n[0] && console.log("[Visual Designer] identify (snippet) called with:", n[0]);
          break;
        case "enableEditor":
          (N ?? Y()).enableEditor();
          break;
        case "disableEditor":
          N?.disableEditor();
          break;
        case "loadGuides":
          N?.loadGuides();
          break;
        case "getGuides":
          return N?.getGuides();
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
  e && Array.isArray(e._q) && (Ni = !0, e.initialize = (t) => Y(t), e.identify = (t) => {
    t && console.log("[Visual Designer] identify (snippet) called with:", t);
  }, e.enableEditor = () => (N ?? Y()).enableEditor(), e.disableEditor = () => N?.disableEditor(), e.loadGuides = () => N?.loadGuides(), e.getGuides = () => N?.getGuides(), e.getInstance = Bi, e.init = Y, Wi(e._q));
  try {
    const t = new URL(window.location.href), i = t.searchParams.get("designer"), n = t.searchParams.get("mode"), r = t.searchParams.get("iud");
    i === "true" && (n && (window.__visualDesignerMode = n, localStorage.setItem("designerModeType", n)), localStorage.setItem("designerMode", "true"), r && localStorage.setItem(Hi, r), t.searchParams.delete("designer"), t.searchParams.delete("mode"), t.searchParams.delete("iud"), window.history.replaceState({}, "", t.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !N && !Ni) {
  const e = () => {
    N || Y();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
typeof window < "u" && (window.VisualDesigner = {
  init: Y,
  initialize: Y,
  getInstance: Bi,
  DesignerSDK: $i,
  apiClient: re,
  _processQueue: Wi
});
export {
  $i as DesignerSDK,
  Wi as _processQueue,
  re as apiClient,
  Bi as getInstance,
  Y as init
};
