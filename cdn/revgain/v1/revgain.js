class at {
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
      const l = r[0], u = e.getAttribute(l);
      return {
        selector: `[${l}="${this.escapeAttribute(u)}"]`,
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
      const r = n.tagName.toLowerCase(), o = n.parentElement;
      if (!o) {
        i.unshift(r);
        break;
      }
      const l = Array.from(o.children).filter((u) => u.tagName === n.tagName).indexOf(n) + 1;
      i.unshift(`${r}[${l}]`), n = o;
    }
    return "/" + i.join("/");
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
      return document.evaluate(e, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
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
      for (let u = 1; u < o.length; u++) l.push(this.buildSegment(o[u]));
    } else {
      const u = (n.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (u.length < 2) return null;
      const c = this.generatePathSelector(n);
      if (!c) return null;
      const h = u.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      l.push(`${c}:contains('${h}')`);
      for (let d = 1; d < o.length; d++) l.push(this.buildSegment(o[d]));
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
function Rn(t) {
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
function ni(t) {
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0" && t.getBoundingClientRect().height > 0 && t.getBoundingClientRect().width > 0;
}
function We() {
  return window.location.pathname || "/";
}
function On() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Pn(t) {
  const e = t.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function An(t) {
  Pn(t) || t.scrollIntoView({ behavior: "smooth", block: "center" });
}
const ri = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class Ln {
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
      if (i.closest(ri)) {
        this.hideHighlight();
        return;
      }
      if (!ni(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (e) => {
    if (!this.isActive) return;
    const i = e.target;
    i && (i.closest(ri) || (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), ni(i) && this.selectElement(i)));
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
    const i = at.generateSelector(e), n = Rn(e), r = at.getXPath(e);
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
var ft, x, Hi, xe, si, $i, Ki, Wi, $t, Ct, xt, Gi, Ge = {}, Qi = [], Dn = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, qe = Array.isArray;
function de(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function Kt(t) {
  t && t.parentNode && t.parentNode.removeChild(t);
}
function It(t, e, i) {
  var n, r, o, a = {};
  for (o in e) o == "key" ? n = e[o] : o == "ref" ? r = e[o] : a[o] = e[o];
  if (arguments.length > 2 && (a.children = arguments.length > 3 ? ft.call(arguments, 2) : i), typeof t == "function" && t.defaultProps != null) for (o in t.defaultProps) a[o] === void 0 && (a[o] = t.defaultProps[o]);
  return rt(t, a, n, r, null);
}
function rt(t, e, i, n, r) {
  var o = { type: t, props: e, key: i, ref: n, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: r ?? ++Hi, __i: -1, __u: 0 };
  return r == null && x.vnode != null && x.vnode(o), o;
}
function X(t) {
  return t.children;
}
function ue(t, e) {
  this.props = t, this.context = e;
}
function Le(t, e) {
  if (e == null) return t.__ ? Le(t.__, t.__i + 1) : null;
  for (var i; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) return i.__e;
  return typeof t.type == "function" ? Le(t) : null;
}
function qi(t) {
  var e, i;
  if ((t = t.__) != null && t.__c != null) {
    for (t.__e = t.__c.base = null, e = 0; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) {
      t.__e = t.__c.base = i.__e;
      break;
    }
    return qi(t);
  }
}
function Tt(t) {
  (!t.__d && (t.__d = !0) && xe.push(t) && !lt.__r++ || si != x.debounceRendering) && ((si = x.debounceRendering) || $i)(lt);
}
function lt() {
  for (var t, e, i, n, r, o, a, l = 1; xe.length; ) xe.length > l && xe.sort(Ki), t = xe.shift(), l = xe.length, t.__d && (i = void 0, n = void 0, r = (n = (e = t).__v).__e, o = [], a = [], e.__P && ((i = de({}, n)).__v = n.__v + 1, x.vnode && x.vnode(i), Wt(e.__P, i, n, e.__n, e.__P.namespaceURI, 32 & n.__u ? [r] : null, o, r ?? Le(n), !!(32 & n.__u), a), i.__v = n.__v, i.__.__k[i.__i] = i, Yi(o, i, a), n.__e = n.__ = null, i.__e != r && qi(i)));
  lt.__r = 0;
}
function Vi(t, e, i, n, r, o, a, l, u, c, h) {
  var d, p, m, v, _, E, S, b = n && n.__k || Qi, F = e.length;
  for (u = Mn(i, e, b, u, F), d = 0; d < F; d++) (m = i.__k[d]) != null && (p = m.__i == -1 ? Ge : b[m.__i] || Ge, m.__i = d, E = Wt(t, m, p, r, o, a, l, u, c, h), v = m.__e, m.ref && p.ref != m.ref && (p.ref && Gt(p.ref, null, m), h.push(m.ref, m.__c || v, m)), _ == null && v != null && (_ = v), (S = !!(4 & m.__u)) || p.__k === m.__k ? u = ji(m, u, t, S) : typeof m.type == "function" && E !== void 0 ? u = E : v && (u = v.nextSibling), m.__u &= -7);
  return i.__e = _, u;
}
function Mn(t, e, i, n, r) {
  var o, a, l, u, c, h = i.length, d = h, p = 0;
  for (t.__k = new Array(r), o = 0; o < r; o++) (a = e[o]) != null && typeof a != "boolean" && typeof a != "function" ? (typeof a == "string" || typeof a == "number" || typeof a == "bigint" || a.constructor == String ? a = t.__k[o] = rt(null, a, null, null, null) : qe(a) ? a = t.__k[o] = rt(X, { children: a }, null, null, null) : a.constructor === void 0 && a.__b > 0 ? a = t.__k[o] = rt(a.type, a.props, a.key, a.ref ? a.ref : null, a.__v) : t.__k[o] = a, u = o + p, a.__ = t, a.__b = t.__b + 1, l = null, (c = a.__i = Fn(a, i, u, d)) != -1 && (d--, (l = i[c]) && (l.__u |= 2)), l == null || l.__v == null ? (c == -1 && (r > h ? p-- : r < h && p++), typeof a.type != "function" && (a.__u |= 4)) : c != u && (c == u - 1 ? p-- : c == u + 1 ? p++ : (c > u ? p-- : p++, a.__u |= 4))) : t.__k[o] = null;
  if (d) for (o = 0; o < h; o++) (l = i[o]) != null && (2 & l.__u) == 0 && (l.__e == n && (n = Le(l)), Ji(l, l));
  return n;
}
function ji(t, e, i, n) {
  var r, o;
  if (typeof t.type == "function") {
    for (r = t.__k, o = 0; r && o < r.length; o++) r[o] && (r[o].__ = t, e = ji(r[o], e, i, n));
    return e;
  }
  t.__e != e && (n && (e && t.type && !e.parentNode && (e = Le(t)), i.insertBefore(t.__e, e || null)), e = t.__e);
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
function Fn(t, e, i, n) {
  var r, o, a, l = t.key, u = t.type, c = e[i], h = c != null && (2 & c.__u) == 0;
  if (c === null && l == null || h && l == c.key && u == c.type) return i;
  if (n > (h ? 1 : 0)) {
    for (r = i - 1, o = i + 1; r >= 0 || o < e.length; ) if ((c = e[a = r >= 0 ? r-- : o++]) != null && (2 & c.__u) == 0 && l == c.key && u == c.type) return a;
  }
  return -1;
}
function oi(t, e, i) {
  e[0] == "-" ? t.setProperty(e, i ?? "") : t[e] = i == null ? "" : typeof i != "number" || Dn.test(e) ? i : i + "px";
}
function Xe(t, e, i, n, r) {
  var o, a;
  e: if (e == "style") if (typeof i == "string") t.style.cssText = i;
  else {
    if (typeof n == "string" && (t.style.cssText = n = ""), n) for (e in n) i && e in i || oi(t.style, e, "");
    if (i) for (e in i) n && i[e] == n[e] || oi(t.style, e, i[e]);
  }
  else if (e[0] == "o" && e[1] == "n") o = e != (e = e.replace(Wi, "$1")), a = e.toLowerCase(), e = a in t || e == "onFocusOut" || e == "onFocusIn" ? a.slice(2) : e.slice(2), t.l || (t.l = {}), t.l[e + o] = i, i ? n ? i.u = n.u : (i.u = $t, t.addEventListener(e, o ? xt : Ct, o)) : t.removeEventListener(e, o ? xt : Ct, o);
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
function ai(t) {
  return function(e) {
    if (this.l) {
      var i = this.l[e.type + t];
      if (e.t == null) e.t = $t++;
      else if (e.t < i.u) return;
      return i(x.event ? x.event(e) : e);
    }
  };
}
function Wt(t, e, i, n, r, o, a, l, u, c) {
  var h, d, p, m, v, _, E, S, b, F, U, $, L, N, I, P, G, D = e.type;
  if (e.constructor !== void 0) return null;
  128 & i.__u && (u = !!(32 & i.__u), o = [l = e.__e = i.__e]), (h = x.__b) && h(e);
  e: if (typeof D == "function") try {
    if (S = e.props, b = "prototype" in D && D.prototype.render, F = (h = D.contextType) && n[h.__c], U = h ? F ? F.props.value : h.__ : n, i.__c ? E = (d = e.__c = i.__c).__ = d.__E : (b ? e.__c = d = new D(S, U) : (e.__c = d = new ue(S, U), d.constructor = D, d.render = Un), F && F.sub(d), d.state || (d.state = {}), d.__n = n, p = d.__d = !0, d.__h = [], d._sb = []), b && d.__s == null && (d.__s = d.state), b && D.getDerivedStateFromProps != null && (d.__s == d.state && (d.__s = de({}, d.__s)), de(d.__s, D.getDerivedStateFromProps(S, d.__s))), m = d.props, v = d.state, d.__v = e, p) b && D.getDerivedStateFromProps == null && d.componentWillMount != null && d.componentWillMount(), b && d.componentDidMount != null && d.__h.push(d.componentDidMount);
    else {
      if (b && D.getDerivedStateFromProps == null && S !== m && d.componentWillReceiveProps != null && d.componentWillReceiveProps(S, U), e.__v == i.__v || !d.__e && d.shouldComponentUpdate != null && d.shouldComponentUpdate(S, d.__s, U) === !1) {
        for (e.__v != i.__v && (d.props = S, d.state = d.__s, d.__d = !1), e.__e = i.__e, e.__k = i.__k, e.__k.some(function(w) {
          w && (w.__ = e);
        }), $ = 0; $ < d._sb.length; $++) d.__h.push(d._sb[$]);
        d._sb = [], d.__h.length && a.push(d);
        break e;
      }
      d.componentWillUpdate != null && d.componentWillUpdate(S, d.__s, U), b && d.componentDidUpdate != null && d.__h.push(function() {
        d.componentDidUpdate(m, v, _);
      });
    }
    if (d.context = U, d.props = S, d.__P = t, d.__e = !1, L = x.__r, N = 0, b) {
      for (d.state = d.__s, d.__d = !1, L && L(e), h = d.render(d.props, d.state, d.context), I = 0; I < d._sb.length; I++) d.__h.push(d._sb[I]);
      d._sb = [];
    } else do
      d.__d = !1, L && L(e), h = d.render(d.props, d.state, d.context), d.state = d.__s;
    while (d.__d && ++N < 25);
    d.state = d.__s, d.getChildContext != null && (n = de(de({}, n), d.getChildContext())), b && !p && d.getSnapshotBeforeUpdate != null && (_ = d.getSnapshotBeforeUpdate(m, v)), P = h, h != null && h.type === X && h.key == null && (P = Xi(h.props.children)), l = Vi(t, qe(P) ? P : [P], e, i, n, r, o, a, l, u, c), d.base = e.__e, e.__u &= -161, d.__h.length && a.push(d), E && (d.__E = d.__ = null);
  } catch (w) {
    if (e.__v = null, u || o != null) if (w.then) {
      for (e.__u |= u ? 160 : 128; l && l.nodeType == 8 && l.nextSibling; ) l = l.nextSibling;
      o[o.indexOf(l)] = null, e.__e = l;
    } else {
      for (G = o.length; G--; ) Kt(o[G]);
      kt(e);
    }
    else e.__e = i.__e, e.__k = i.__k, w.then || kt(e);
    x.__e(w, e, i);
  }
  else o == null && e.__v == i.__v ? (e.__k = i.__k, e.__e = i.__e) : l = e.__e = Nn(i.__e, e, i, n, r, o, a, u, c);
  return (h = x.diffed) && h(e), 128 & e.__u ? void 0 : l;
}
function kt(t) {
  t && t.__c && (t.__c.__e = !0), t && t.__k && t.__k.forEach(kt);
}
function Yi(t, e, i) {
  for (var n = 0; n < i.length; n++) Gt(i[n], i[++n], i[++n]);
  x.__c && x.__c(e, t), t.some(function(r) {
    try {
      t = r.__h, r.__h = [], t.some(function(o) {
        o.call(r);
      });
    } catch (o) {
      x.__e(o, r.__v);
    }
  });
}
function Xi(t) {
  return typeof t != "object" || t == null || t.__b && t.__b > 0 ? t : qe(t) ? t.map(Xi) : de({}, t);
}
function Nn(t, e, i, n, r, o, a, l, u) {
  var c, h, d, p, m, v, _, E = i.props || Ge, S = e.props, b = e.type;
  if (b == "svg" ? r = "http://www.w3.org/2000/svg" : b == "math" ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), o != null) {
    for (c = 0; c < o.length; c++) if ((m = o[c]) && "setAttribute" in m == !!b && (b ? m.localName == b : m.nodeType == 3)) {
      t = m, o[c] = null;
      break;
    }
  }
  if (t == null) {
    if (b == null) return document.createTextNode(S);
    t = document.createElementNS(r, b, S.is && S), l && (x.__m && x.__m(e, o), l = !1), o = null;
  }
  if (b == null) E === S || l && t.data == S || (t.data = S);
  else {
    if (o = o && ft.call(t.childNodes), !l && o != null) for (E = {}, c = 0; c < t.attributes.length; c++) E[(m = t.attributes[c]).name] = m.value;
    for (c in E) if (m = E[c], c != "children") {
      if (c == "dangerouslySetInnerHTML") d = m;
      else if (!(c in S)) {
        if (c == "value" && "defaultValue" in S || c == "checked" && "defaultChecked" in S) continue;
        Xe(t, c, null, m, r);
      }
    }
    for (c in S) m = S[c], c == "children" ? p = m : c == "dangerouslySetInnerHTML" ? h = m : c == "value" ? v = m : c == "checked" ? _ = m : l && typeof m != "function" || E[c] === m || Xe(t, c, m, E[c], r);
    if (h) l || d && (h.__html == d.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), e.__k = [];
    else if (d && (t.innerHTML = ""), Vi(e.type == "template" ? t.content : t, qe(p) ? p : [p], e, i, n, b == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r, o, a, o ? o[0] : i.__k && Le(i, 0), l, u), o != null) for (c = o.length; c--; ) Kt(o[c]);
    l || (c = "value", b == "progress" && v == null ? t.removeAttribute("value") : v != null && (v !== t[c] || b == "progress" && !v || b == "option" && v != E[c]) && Xe(t, c, v, E[c], r), c = "checked", _ != null && _ != t[c] && Xe(t, c, _, E[c], r));
  }
  return t;
}
function Gt(t, e, i) {
  try {
    if (typeof t == "function") {
      var n = typeof t.__u == "function";
      n && t.__u(), n && e == null || (t.__u = t(e));
    } else t.current = e;
  } catch (r) {
    x.__e(r, i);
  }
}
function Ji(t, e, i) {
  var n, r;
  if (x.unmount && x.unmount(t), (n = t.ref) && (n.current && n.current != t.__e || Gt(n, null, e)), (n = t.__c) != null) {
    if (n.componentWillUnmount) try {
      n.componentWillUnmount();
    } catch (o) {
      x.__e(o, e);
    }
    n.base = n.__P = null;
  }
  if (n = t.__k) for (r = 0; r < n.length; r++) n[r] && Ji(n[r], e, i || typeof t.type != "function");
  i || Kt(t.__e), t.__c = t.__ = t.__e = void 0;
}
function Un(t, e, i) {
  return this.constructor(t, i);
}
function De(t, e, i) {
  var n, r, o, a;
  e == document && (e = document.documentElement), x.__ && x.__(t, e), r = (n = !1) ? null : e.__k, o = [], a = [], Wt(e, t = e.__k = It(X, null, [t]), r || Ge, Ge, e.namespaceURI, r ? null : e.firstChild ? ft.call(e.childNodes) : null, o, r ? r.__e : e.firstChild, n, a), Yi(o, t, a);
}
function Qt(t) {
  function e(i) {
    var n, r;
    return this.getChildContext || (n = /* @__PURE__ */ new Set(), (r = {})[e.__c] = this, this.getChildContext = function() {
      return r;
    }, this.componentWillUnmount = function() {
      n = null;
    }, this.shouldComponentUpdate = function(o) {
      this.props.value != o.value && n.forEach(function(a) {
        a.__e = !0, Tt(a);
      });
    }, this.sub = function(o) {
      n.add(o);
      var a = o.componentWillUnmount;
      o.componentWillUnmount = function() {
        n && n.delete(o), a && a.call(o);
      };
    }), i.children;
  }
  return e.__c = "__cC" + Gi++, e.__ = t, e.Provider = e.__l = (e.Consumer = function(i, n) {
    return i.children(n);
  }).contextType = e, e;
}
ft = Qi.slice, x = { __e: function(t, e, i, n) {
  for (var r, o, a; e = e.__; ) if ((r = e.__c) && !r.__) try {
    if ((o = r.constructor) && o.getDerivedStateFromError != null && (r.setState(o.getDerivedStateFromError(t)), a = r.__d), r.componentDidCatch != null && (r.componentDidCatch(t, n || {}), a = r.__d), a) return r.__E = r;
  } catch (l) {
    t = l;
  }
  throw t;
} }, Hi = 0, ue.prototype.setState = function(t, e) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = de({}, this.state), typeof t == "function" && (t = t(de({}, i), this.props)), t && de(i, t), t != null && this.__v && (e && this._sb.push(e), Tt(this));
}, ue.prototype.forceUpdate = function(t) {
  this.__v && (this.__e = !0, t && this.__h.push(t), Tt(this));
}, ue.prototype.render = X, xe = [], $i = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, Ki = function(t, e) {
  return t.__v.__b - e.__v.__b;
}, lt.__r = 0, Wi = /(PointerCapture)$|Capture$/i, $t = 0, Ct = ai(!1), xt = ai(!0), Gi = 0;
var zn = 0;
function s(t, e, i, n, r, o) {
  e || (e = {});
  var a, l, u = e;
  if ("ref" in u) for (l in u = {}, e) l == "ref" ? a = e[l] : u[l] = e[l];
  var c = { type: t, props: u, key: i, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --zn, __i: -1, __u: 0, __source: r, __self: o };
  if (typeof t == "function" && (a = t.defaultProps)) for (l in a) u[l] === void 0 && (u[l] = a[l]);
  return x.vnode && x.vnode(c), c;
}
const R = {
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
function Bn({ guide: t, top: e, left: i, arrowStyle: n, onDismiss: r }) {
  return /* @__PURE__ */ s(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": t.id,
      style: {
        position: "absolute",
        background: R.bg,
        border: `2px solid ${R.primary}`,
        borderRadius: R.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: R.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: R.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: R.text,
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
              background: R.primary,
              color: R.bg,
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
function Hn(t) {
  const e = { position: "absolute" };
  switch (t) {
    case "top":
      return { ...e, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${R.primary} transparent transparent transparent` };
    case "bottom":
      return { ...e, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${R.primary} transparent` };
    case "left":
      return { ...e, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${R.primary}` };
    default:
      return { ...e, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${R.primary} transparent transparent` };
  }
}
function $n(t, e, i, n) {
  const r = t.getBoundingClientRect(), o = window.pageXOffset || document.documentElement.scrollLeft, a = window.pageYOffset || document.documentElement.scrollTop, l = window.innerWidth, u = window.innerHeight;
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
  return h < o ? h = o + 10 : h + i > o + l && (h = o + l - i - 10), c < a ? c = a + 10 : c + n > a + u && (c = a + u - n - 10), { top: c, left: h, arrowStyle: Hn(e) };
}
class Kn {
  container = null;
  onDismiss = () => {
  };
  lastGuides = [];
  dismissedThisSession = /* @__PURE__ */ new Set();
  setOnDismiss(e) {
    this.onDismiss = e;
  }
  renderGuides(e) {
    this.lastGuides = e;
    const i = We(), n = e.filter(
      (o) => o.page === i && o.status === "active" && !this.dismissedThisSession.has(o.id)
    );
    if (n.length === 0 || (this.ensureContainer(), !this.container)) return;
    const r = [];
    for (const o of n) {
      const a = at.findElement(o.selector);
      if (!a) continue;
      An(a);
      const l = $n(a, o.placement, 280, 80);
      r.push({ guide: o, target: a, pos: l });
    }
    De(
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
            zIndex: R.zIndex.guides
          },
          children: r.map(({ guide: o, pos: a }) => /* @__PURE__ */ s(
            Bn,
            {
              guide: o,
              top: a.top,
              left: a.left,
              arrowStyle: a.arrowStyle,
              onDismiss: () => this.dismissGuide(o.id)
            },
            o.id
          ))
        }
      ),
      this.container
    );
  }
  updatePositions(e) {
    this.renderGuides(e);
  }
  dismissGuide(e) {
    this.dismissedThisSession.add(e), this.onDismiss(e), this.renderGuides(this.lastGuides);
  }
  clear() {
    this.dismissedThisSession.clear(), this.container && De(null, this.container);
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
const li = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function Wn({ feature: t, color: e, rect: i }) {
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
        zIndex: R.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${e}`
      }
    }
  );
}
class Gn {
  container = null;
  lastEnabled = !1;
  render(e, i) {
    if (this.lastEnabled = i, this.clear(), !i || e.length === 0) return;
    const n = e.filter((o) => (o.selector || "").trim() !== "");
    if (this.ensureContainer(), !this.container) return;
    const r = n.map((o, a) => {
      const l = at.findElement(o.selector);
      if (!l) return null;
      const u = l.getBoundingClientRect(), c = li[a % li.length];
      return { feature: o, rect: u, color: c };
    }).filter(Boolean);
    r.length !== 0 && De(
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
            zIndex: R.zIndex.overlay - 1
          },
          children: r.map(({ feature: o, rect: a, color: l }) => /* @__PURE__ */ s(
            Wn,
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
    this.container && De(null, this.container);
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
var Me = class {
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
}, Qn = {
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
}, qn = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = Qn;
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
}, Ie = new qn();
function Vn(t) {
  setTimeout(t, 0);
}
var Te = typeof window > "u" || "Deno" in globalThis;
function Y() {
}
function jn(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function Rt(t) {
  return typeof t == "number" && t >= 0 && t !== 1 / 0;
}
function Zi(t, e) {
  return Math.max(t + (e || 0) - Date.now(), 0);
}
function _e(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function ne(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function ci(t, e) {
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
      if (e.queryHash !== qt(a, e.options))
        return !1;
    } else if (!Qe(e.queryKey, a))
      return !1;
  }
  if (i !== "all") {
    const u = e.isActive();
    if (i === "active" && !u || i === "inactive" && u)
      return !1;
  }
  return !(typeof l == "boolean" && e.isStale() !== l || r && r !== e.state.fetchStatus || o && !o(e));
}
function di(t, e) {
  const { exact: i, status: n, predicate: r, mutationKey: o } = t;
  if (o) {
    if (!e.options.mutationKey)
      return !1;
    if (i) {
      if (ke(e.options.mutationKey) !== ke(o))
        return !1;
    } else if (!Qe(e.options.mutationKey, o))
      return !1;
  }
  return !(n && e.state.status !== n || r && !r(e));
}
function qt(t, e) {
  return (e?.queryKeyHashFn || ke)(t);
}
function ke(t) {
  return JSON.stringify(
    t,
    (e, i) => Ot(i) ? Object.keys(i).sort().reduce((n, r) => (n[r] = i[r], n), {}) : i
  );
}
function Qe(t, e) {
  return t === e ? !0 : typeof t != typeof e ? !1 : t && e && typeof t == "object" && typeof e == "object" ? Object.keys(e).every((i) => Qe(t[i], e[i])) : !1;
}
var Yn = Object.prototype.hasOwnProperty;
function en(t, e, i = 0) {
  if (t === e)
    return t;
  if (i > 500) return e;
  const n = ui(t) && ui(e);
  if (!n && !(Ot(t) && Ot(e))) return e;
  const o = (n ? t : Object.keys(t)).length, a = n ? e : Object.keys(e), l = a.length, u = n ? new Array(l) : {};
  let c = 0;
  for (let h = 0; h < l; h++) {
    const d = n ? h : a[h], p = t[d], m = e[d];
    if (p === m) {
      u[d] = p, (n ? h < o : Yn.call(t, d)) && c++;
      continue;
    }
    if (p === null || m === null || typeof p != "object" || typeof m != "object") {
      u[d] = m;
      continue;
    }
    const v = en(p, m, i + 1);
    u[d] = v, v === p && c++;
  }
  return o === l && c === o ? t : u;
}
function dt(t, e) {
  if (!e || Object.keys(t).length !== Object.keys(e).length)
    return !1;
  for (const i in t)
    if (t[i] !== e[i])
      return !1;
  return !0;
}
function ui(t) {
  return Array.isArray(t) && t.length === Object.keys(t).length;
}
function Ot(t) {
  if (!hi(t))
    return !1;
  const e = t.constructor;
  if (e === void 0)
    return !0;
  const i = e.prototype;
  return !(!hi(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(t) !== Object.prototype);
}
function hi(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function Xn(t) {
  return new Promise((e) => {
    Ie.setTimeout(e, t);
  });
}
function Pt(t, e, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(t, e) : i.structuralSharing !== !1 ? en(t, e) : e;
}
function Jn(t, e, i = 0) {
  const n = [...t, e];
  return i && n.length > i ? n.slice(1) : n;
}
function Zn(t, e, i = 0) {
  const n = [e, ...t];
  return i && n.length > i ? n.slice(0, -1) : n;
}
var Vt = /* @__PURE__ */ Symbol();
function tn(t, e) {
  return !t.queryFn && e?.initialPromise ? () => e.initialPromise : !t.queryFn || t.queryFn === Vt ? () => Promise.reject(new Error(`Missing queryFn: '${t.queryHash}'`)) : t.queryFn;
}
function jt(t, e) {
  return typeof t == "function" ? t(...e) : !!t;
}
function er(t, e, i) {
  let n = !1, r;
  return Object.defineProperty(t, "signal", {
    enumerable: !0,
    get: () => (r ??= e(), n || (n = !0, r.aborted ? i() : r.addEventListener("abort", i, { once: !0 })), r)
  }), t;
}
var tr = class extends Me {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!Te && window.addEventListener) {
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
}, Yt = new tr();
function At() {
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
var ir = Vn;
function nr() {
  let t = [], e = 0, i = (l) => {
    l();
  }, n = (l) => {
    l();
  }, r = ir;
  const o = (l) => {
    e ? t.push(l) : r(() => {
      i(l);
    });
  }, a = () => {
    const l = t;
    t = [], l.length && r(() => {
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
      e++;
      try {
        u = l();
      } finally {
        e--, e || a();
      }
      return u;
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: (l) => (...u) => {
      o(() => {
        l(...u);
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
var H = nr(), rr = class extends Me {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!Te && window.addEventListener) {
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
}, ut = new rr();
function sr(t) {
  return Math.min(1e3 * 2 ** t, 3e4);
}
function nn(t) {
  return (t ?? "online") === "online" ? ut.isOnline() : !0;
}
var Lt = class extends Error {
  constructor(t) {
    super("CancelledError"), this.revert = t?.revert, this.silent = t?.silent;
  }
};
function rn(t) {
  let e = !1, i = 0, n;
  const r = At(), o = () => r.status !== "pending", a = (_) => {
    if (!o()) {
      const E = new Lt(_);
      p(E), t.onCancel?.(E);
    }
  }, l = () => {
    e = !0;
  }, u = () => {
    e = !1;
  }, c = () => Yt.isFocused() && (t.networkMode === "always" || ut.isOnline()) && t.canRun(), h = () => nn(t.networkMode) && t.canRun(), d = (_) => {
    o() || (n?.(), r.resolve(_));
  }, p = (_) => {
    o() || (n?.(), r.reject(_));
  }, m = () => new Promise((_) => {
    n = (E) => {
      (o() || c()) && _(E);
    }, t.onPause?.();
  }).then(() => {
    n = void 0, o() || t.onContinue?.();
  }), v = () => {
    if (o())
      return;
    let _;
    const E = i === 0 ? t.initialPromise : void 0;
    try {
      _ = E ?? t.fn();
    } catch (S) {
      _ = Promise.reject(S);
    }
    Promise.resolve(_).then(d).catch((S) => {
      if (o())
        return;
      const b = t.retry ?? (Te ? 0 : 3), F = t.retryDelay ?? sr, U = typeof F == "function" ? F(i, S) : F, $ = b === !0 || typeof b == "number" && i < b || typeof b == "function" && b(i, S);
      if (e || !$) {
        p(S);
        return;
      }
      i++, t.onFail?.(i, S), Xn(U).then(() => c() ? void 0 : m()).then(() => {
        e ? p(S) : v();
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
var sn = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), Rt(this.gcTime) && (this.#e = Ie.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(t) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      t ?? (Te ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (Ie.clearTimeout(this.#e), this.#e = void 0);
  }
}, or = class extends sn {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(t) {
    super(), this.#a = !1, this.#o = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.#r = t.client, this.#i = this.#r.getQueryCache(), this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.#e = pi(this.options), this.state = t.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(t) {
    if (this.options = { ...this.#o, ...t }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const e = pi(this.options);
      e.data !== void 0 && (this.setState(
        fi(e.data, e.dataUpdatedAt)
      ), this.#e = e);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(t, e) {
    const i = Pt(this.state.data, t, this.options);
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
      (t) => ne(t.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === Vt || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => _e(t.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => t.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(t = 0) {
    return this.state.data === void 0 ? !0 : t === "static" ? !1 : this.state.isInvalidated ? !0 : !Zi(this.state.dataUpdatedAt, t);
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
      const l = this.observers.find((u) => u.options.queryFn);
      l && this.setOptions(l.options);
    }
    const i = new AbortController(), n = (l) => {
      Object.defineProperty(l, "signal", {
        enumerable: !0,
        get: () => (this.#a = !0, i.signal)
      });
    }, r = () => {
      const l = tn(this.options, e), c = (() => {
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
    this.options.behavior?.onFetch(a, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#s({ type: "fetch", meta: a.fetchOptions?.meta }), this.#n = rn({
      initialPromise: e?.initialPromise,
      fn: a.fetchFn,
      onCancel: (l) => {
        l instanceof Lt && l.revert && this.setState({
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
      if (l instanceof Lt) {
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
            ...on(i.data, this.options),
            fetchMeta: t.meta ?? null
          };
        case "success":
          const n = {
            ...i,
            ...fi(t.data, t.dataUpdatedAt),
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
function on(t, e) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: nn(e.networkMode) ? "fetching" : "paused",
    ...t === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function fi(t, e) {
  return {
    data: t,
    dataUpdatedAt: e ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function pi(t) {
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
var ar = class extends Me {
  constructor(t, e) {
    super(), this.options = e, this.#e = t, this.#s = null, this.#a = At(), this.bindMethods(), this.setOptions(e);
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
    this.listeners.size === 1 && (this.#t.addObserver(this), mi(this.#t, this.options) ? this.#u() : this.updateResult(), this.#v());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return Dt(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return Dt(
      this.#t,
      this.options,
      this.options.refetchOnWindowFocus
    );
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set(), this.#b(), this.#S(), this.#t.removeObserver(this);
  }
  setOptions(t) {
    const e = this.options, i = this.#t;
    if (this.options = this.#e.defaultQueryOptions(t), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof ne(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#w(), this.#t.setOptions(this.options), e._defaulted && !dt(this.options, e) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const n = this.hasListeners();
    n && gi(
      this.#t,
      i,
      this.options,
      e
    ) && this.#u(), this.updateResult(), n && (this.#t !== i || ne(this.options.enabled, this.#t) !== ne(e.enabled, this.#t) || _e(this.options.staleTime, this.#t) !== _e(e.staleTime, this.#t)) && this.#g();
    const r = this.#y();
    n && (this.#t !== i || ne(this.options.enabled, this.#t) !== ne(e.enabled, this.#t) || r !== this.#l) && this.#_(r);
  }
  getOptimisticResult(t) {
    const e = this.#e.getQueryCache().build(this.#e, t), i = this.createResult(e, t);
    return cr(this, i) && (this.#r = i, this.#o = this.options, this.#n = this.#t.state), i;
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
    this.#w();
    let e = this.#t.fetch(
      this.options,
      t
    );
    return t?.throwOnError || (e = e.catch(Y)), e;
  }
  #g() {
    this.#b();
    const t = _e(
      this.options.staleTime,
      this.#t
    );
    if (Te || this.#r.isStale || !Rt(t))
      return;
    const i = Zi(this.#r.dataUpdatedAt, t) + 1;
    this.#c = Ie.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(t) {
    this.#S(), this.#l = t, !(Te || ne(this.options.enabled, this.#t) === !1 || !Rt(this.#l) || this.#l === 0) && (this.#d = Ie.setInterval(() => {
      (this.options.refetchIntervalInBackground || Yt.isFocused()) && this.#u();
    }, this.#l));
  }
  #v() {
    this.#g(), this.#_(this.#y());
  }
  #b() {
    this.#c && (Ie.clearTimeout(this.#c), this.#c = void 0);
  }
  #S() {
    this.#d && (Ie.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(t, e) {
    const i = this.#t, n = this.options, r = this.#r, o = this.#n, a = this.#o, u = t !== i ? t.state : this.#i, { state: c } = t;
    let h = { ...c }, d = !1, p;
    if (e._optimisticResults) {
      const I = this.hasListeners(), P = !I && mi(t, e), G = I && gi(t, i, e, n);
      (P || G) && (h = {
        ...h,
        ...on(c.data, t.options)
      }), e._optimisticResults === "isRestoring" && (h.fetchStatus = "idle");
    }
    let { error: m, errorUpdatedAt: v, status: _ } = h;
    p = h.data;
    let E = !1;
    if (e.placeholderData !== void 0 && p === void 0 && _ === "pending") {
      let I;
      r?.isPlaceholderData && e.placeholderData === a?.placeholderData ? (I = r.data, E = !0) : I = typeof e.placeholderData == "function" ? e.placeholderData(
        this.#f?.state.data,
        this.#f
      ) : e.placeholderData, I !== void 0 && (_ = "success", p = Pt(
        r?.data,
        I,
        e
      ), d = !0);
    }
    if (e.select && p !== void 0 && !E)
      if (r && p === o?.data && e.select === this.#m)
        p = this.#h;
      else
        try {
          this.#m = e.select, p = e.select(p), p = Pt(r?.data, p, e), this.#h = p, this.#s = null;
        } catch (I) {
          this.#s = I;
        }
    this.#s && (m = this.#s, p = this.#h, v = Date.now(), _ = "error");
    const S = h.fetchStatus === "fetching", b = _ === "pending", F = _ === "error", U = b && S, $ = p !== void 0, N = {
      status: _,
      fetchStatus: h.fetchStatus,
      isPending: b,
      isSuccess: _ === "success",
      isError: F,
      isInitialLoading: U,
      isLoading: U,
      data: p,
      dataUpdatedAt: h.dataUpdatedAt,
      error: m,
      errorUpdatedAt: v,
      failureCount: h.fetchFailureCount,
      failureReason: h.fetchFailureReason,
      errorUpdateCount: h.errorUpdateCount,
      isFetched: h.dataUpdateCount > 0 || h.errorUpdateCount > 0,
      isFetchedAfterMount: h.dataUpdateCount > u.dataUpdateCount || h.errorUpdateCount > u.errorUpdateCount,
      isFetching: S,
      isRefetching: S && !b,
      isLoadingError: F && !$,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: d,
      isRefetchError: F && $,
      isStale: Xt(t, e),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: ne(e.enabled, t) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const I = N.data !== void 0, P = N.status === "error" && !I, G = (K) => {
        P ? K.reject(N.error) : I && K.resolve(N.data);
      }, D = () => {
        const K = this.#a = N.promise = At();
        G(K);
      }, w = this.#a;
      switch (w.status) {
        case "pending":
          t.queryHash === i.queryHash && G(w);
          break;
        case "fulfilled":
          (P || N.data !== w.value) && D();
          break;
        case "rejected":
          (!P || N.error !== w.reason) && D();
          break;
      }
    }
    return N;
  }
  updateResult() {
    const t = this.#r, e = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#f = this.#t), dt(e, t))
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
  #w() {
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
function lr(t, e) {
  return ne(e.enabled, t) !== !1 && t.state.data === void 0 && !(t.state.status === "error" && e.retryOnMount === !1);
}
function mi(t, e) {
  return lr(t, e) || t.state.data !== void 0 && Dt(t, e, e.refetchOnMount);
}
function Dt(t, e, i) {
  if (ne(e.enabled, t) !== !1 && _e(e.staleTime, t) !== "static") {
    const n = typeof i == "function" ? i(t) : i;
    return n === "always" || n !== !1 && Xt(t, e);
  }
  return !1;
}
function gi(t, e, i, n) {
  return (t !== e || ne(n.enabled, t) === !1) && (!i.suspense || t.state.status !== "error") && Xt(t, i);
}
function Xt(t, e) {
  return ne(e.enabled, t) !== !1 && t.isStaleByTime(_e(e.staleTime, t));
}
function cr(t, e) {
  return !dt(t.getCurrentResult(), e);
}
function yi(t) {
  return {
    onFetch: (e, i) => {
      const n = e.options, r = e.fetchOptions?.meta?.fetchMore?.direction, o = e.state.data?.pages || [], a = e.state.data?.pageParams || [];
      let l = { pages: [], pageParams: [] }, u = 0;
      const c = async () => {
        let h = !1;
        const d = (v) => {
          er(
            v,
            () => e.signal,
            () => h = !0
          );
        }, p = tn(e.options, e.fetchOptions), m = async (v, _, E) => {
          if (h)
            return Promise.reject();
          if (_ == null && v.pages.length)
            return Promise.resolve(v);
          const b = (() => {
            const L = {
              client: e.client,
              queryKey: e.queryKey,
              pageParam: _,
              direction: E ? "backward" : "forward",
              meta: e.options.meta
            };
            return d(L), L;
          })(), F = await p(b), { maxPages: U } = e.options, $ = E ? Zn : Jn;
          return {
            pages: $(v.pages, F, U),
            pageParams: $(v.pageParams, _, U)
          };
        };
        if (r && o.length) {
          const v = r === "backward", _ = v ? dr : _i, E = {
            pages: o,
            pageParams: a
          }, S = _(n, E);
          l = await m(E, S, v);
        } else {
          const v = t ?? o.length;
          do {
            const _ = u === 0 ? a[0] ?? n.initialPageParam : _i(n, l);
            if (u > 0 && _ == null)
              break;
            l = await m(l, _), u++;
          } while (u < v);
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
function _i(t, { pages: e, pageParams: i }) {
  const n = e.length - 1;
  return e.length > 0 ? t.getNextPageParam(
    e[n],
    e,
    i[n],
    i
  ) : void 0;
}
function dr(t, { pages: e, pageParams: i }) {
  return e.length > 0 ? t.getPreviousPageParam?.(e[0], e, i[0], i) : void 0;
}
var ur = class extends sn {
  #e;
  #t;
  #i;
  #r;
  constructor(t) {
    super(), this.#e = t.client, this.mutationId = t.mutationId, this.#i = t.mutationCache, this.#t = [], this.state = t.state || an(), this.setOptions(t.options), this.scheduleGc();
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
    this.#r = rn({
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
function an() {
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
var hr = class extends Me {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(t, e, i) {
    const n = new ur({
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
    const e = Je(t);
    if (typeof e == "string") {
      const i = this.#t.get(e);
      i ? i.push(t) : this.#t.set(e, [t]);
    }
    this.notify({ type: "added", mutation: t });
  }
  remove(t) {
    if (this.#e.delete(t)) {
      const e = Je(t);
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
    const e = Je(t);
    if (typeof e == "string") {
      const n = this.#t.get(e)?.find(
        (r) => r.state.status === "pending"
      );
      return !n || n === t;
    } else
      return !0;
  }
  runNext(t) {
    const e = Je(t);
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
      (i) => di(e, i)
    );
  }
  findAll(t = {}) {
    return this.getAll().filter((e) => di(t, e));
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
function Je(t) {
  return t.options.scope?.id;
}
var fr = class extends Me {
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
    this.options = this.#e.defaultMutationOptions(t), dt(this.options, e) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), e?.mutationKey && this.options.mutationKey && ke(e.mutationKey) !== ke(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
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
    const t = this.#i?.state ?? an();
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
}, pr = class extends Me {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(t, e, i) {
    const n = e.queryKey, r = e.queryHash ?? qt(n, e);
    let o = this.get(r);
    return o || (o = new or({
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
      (i) => ci(e, i)
    );
  }
  findAll(t = {}) {
    const e = this.getAll();
    return Object.keys(t).length > 0 ? e.filter((i) => ci(t, i)) : e;
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
}, mr = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  #s;
  constructor(t = {}) {
    this.#e = t.queryCache || new pr(), this.#t = t.mutationCache || new hr(), this.#i = t.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = Yt.subscribe(async (t) => {
      t && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = ut.subscribe(async (t) => {
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
    return n === void 0 ? this.fetchQuery(t) : (t.revalidateIfStale && i.isStaleByTime(_e(e.staleTime, i)) && this.prefetchQuery(e), Promise.resolve(n));
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
    )?.state.data, a = jn(e, o);
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
      _e(e.staleTime, i)
    ) ? i.fetch(e) : Promise.resolve(i.state.data);
  }
  prefetchQuery(t) {
    return this.fetchQuery(t).then(Y).catch(Y);
  }
  fetchInfiniteQuery(t) {
    return t.behavior = yi(t.pages), this.fetchQuery(t);
  }
  prefetchInfiniteQuery(t) {
    return this.fetchInfiniteQuery(t).then(Y).catch(Y);
  }
  ensureInfiniteQueryData(t) {
    return t.behavior = yi(t.pages), this.ensureQueryData(t);
  }
  resumePausedMutations() {
    return ut.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
    this.#r.set(ke(t), {
      queryKey: t,
      defaultOptions: e
    });
  }
  getQueryDefaults(t) {
    const e = [...this.#r.values()], i = {};
    return e.forEach((n) => {
      Qe(t, n.queryKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  setMutationDefaults(t, e) {
    this.#n.set(ke(t), {
      mutationKey: t,
      defaultOptions: e
    });
  }
  getMutationDefaults(t) {
    const e = [...this.#n.values()], i = {};
    return e.forEach((n) => {
      Qe(t, n.mutationKey) && Object.assign(i, n.defaultOptions);
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
    return e.queryHash || (e.queryHash = qt(
      e.queryKey,
      e
    )), e.refetchOnReconnect === void 0 && (e.refetchOnReconnect = e.networkMode !== "always"), e.throwOnError === void 0 && (e.throwOnError = !!e.suspense), !e.networkMode && e.persister && (e.networkMode = "offlineFirst"), e.queryFn === Vt && (e.enabled = !1), e;
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
}, Re, z, yt, vi, ht = 0, ln = [], B = x, bi = B.__b, Si = B.__r, wi = B.diffed, Ei = B.__c, Ci = B.unmount, xi = B.__;
function Ve(t, e) {
  B.__h && B.__h(z, t, ht || e), ht = 0;
  var i = z.__H || (z.__H = { __: [], __h: [] });
  return t >= i.__.length && i.__.push({}), i.__[t];
}
function C(t) {
  return ht = 1, gr(cn, t);
}
function gr(t, e, i) {
  var n = Ve(Re++, 2);
  if (n.t = t, !n.__c && (n.__ = [i ? i(e) : cn(void 0, e), function(l) {
    var u = n.__N ? n.__N[0] : n.__[0], c = n.t(u, l);
    u !== c && (n.__N = [c, n.__[1]], n.__c.setState({}));
  }], n.__c = z, !z.__f)) {
    var r = function(l, u, c) {
      if (!n.__c.__H) return !0;
      var h = n.__c.__H.__.filter(function(p) {
        return !!p.__c;
      });
      if (h.every(function(p) {
        return !p.__N;
      })) return !o || o.call(this, l, u, c);
      var d = n.__c.props !== l;
      return h.forEach(function(p) {
        if (p.__N) {
          var m = p.__[0];
          p.__ = p.__N, p.__N = void 0, m !== p.__[0] && (d = !0);
        }
      }), o && o.call(this, l, u, c) || d;
    };
    z.__f = !0;
    var o = z.shouldComponentUpdate, a = z.componentWillUpdate;
    z.componentWillUpdate = function(l, u, c) {
      if (this.__e) {
        var h = o;
        o = void 0, r(l, u, c), o = h;
      }
      a && a.call(this, l, u, c);
    }, z.shouldComponentUpdate = r;
  }
  return n.__N || n.__;
}
function q(t, e) {
  var i = Ve(Re++, 3);
  !B.__s && Zt(i.__H, e) && (i.__ = t, i.u = e, z.__H.__h.push(i));
}
function yr(t, e) {
  var i = Ve(Re++, 4);
  !B.__s && Zt(i.__H, e) && (i.__ = t, i.u = e, z.__h.push(i));
}
function Mt(t, e) {
  var i = Ve(Re++, 7);
  return Zt(i.__H, e) && (i.__ = t(), i.__H = e, i.__h = t), i.__;
}
function se(t, e) {
  return ht = 8, Mt(function() {
    return t;
  }, e);
}
function Jt(t) {
  var e = z.context[t.__c], i = Ve(Re++, 9);
  return i.c = t, e ? (i.__ == null && (i.__ = !0, e.sub(z)), e.props.value) : t.__;
}
function _r() {
  for (var t; t = ln.shift(); ) if (t.__P && t.__H) try {
    t.__H.__h.forEach(st), t.__H.__h.forEach(Ft), t.__H.__h = [];
  } catch (e) {
    t.__H.__h = [], B.__e(e, t.__v);
  }
}
B.__b = function(t) {
  z = null, bi && bi(t);
}, B.__ = function(t, e) {
  t && e.__k && e.__k.__m && (t.__m = e.__k.__m), xi && xi(t, e);
}, B.__r = function(t) {
  Si && Si(t), Re = 0;
  var e = (z = t.__c).__H;
  e && (yt === z ? (e.__h = [], z.__h = [], e.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (e.__h.forEach(st), e.__h.forEach(Ft), e.__h = [], Re = 0)), yt = z;
}, B.diffed = function(t) {
  wi && wi(t);
  var e = t.__c;
  e && e.__H && (e.__H.__h.length && (ln.push(e) !== 1 && vi === B.requestAnimationFrame || ((vi = B.requestAnimationFrame) || vr)(_r)), e.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), yt = z = null;
}, B.__c = function(t, e) {
  e.some(function(i) {
    try {
      i.__h.forEach(st), i.__h = i.__h.filter(function(n) {
        return !n.__ || Ft(n);
      });
    } catch (n) {
      e.some(function(r) {
        r.__h && (r.__h = []);
      }), e = [], B.__e(n, i.__v);
    }
  }), Ei && Ei(t, e);
}, B.unmount = function(t) {
  Ci && Ci(t);
  var e, i = t.__c;
  i && i.__H && (i.__H.__.forEach(function(n) {
    try {
      st(n);
    } catch (r) {
      e = r;
    }
  }), i.__H = void 0, e && B.__e(e, i.__v));
};
var Ii = typeof requestAnimationFrame == "function";
function vr(t) {
  var e, i = function() {
    clearTimeout(n), Ii && cancelAnimationFrame(e), setTimeout(t);
  }, n = setTimeout(i, 35);
  Ii && (e = requestAnimationFrame(i));
}
function st(t) {
  var e = z, i = t.__c;
  typeof i == "function" && (t.__c = void 0, i()), z = e;
}
function Ft(t) {
  var e = z;
  t.__c = t.__(), z = e;
}
function Zt(t, e) {
  return !t || t.length !== e.length || e.some(function(i, n) {
    return i !== t[n];
  });
}
function cn(t, e) {
  return typeof e == "function" ? e(t) : e;
}
function br(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function Ti(t, e) {
  for (var i in t) if (i !== "__source" && !(i in e)) return !0;
  for (var n in e) if (n !== "__source" && t[n] !== e[n]) return !0;
  return !1;
}
function dn(t, e) {
  var i = e(), n = C({ t: { __: i, u: e } }), r = n[0].t, o = n[1];
  return yr(function() {
    r.__ = i, r.u = e, _t(r) && o({ t: r });
  }, [t, i, e]), q(function() {
    return _t(r) && o({ t: r }), t(function() {
      _t(r) && o({ t: r });
    });
  }, [t]), i;
}
function _t(t) {
  var e, i, n = t.u, r = t.__;
  try {
    var o = n();
    return !((e = r) === (i = o) && (e !== 0 || 1 / e == 1 / i) || e != e && i != i);
  } catch {
    return !0;
  }
}
function ki(t, e) {
  this.props = t, this.context = e;
}
(ki.prototype = new ue()).isPureReactComponent = !0, ki.prototype.shouldComponentUpdate = function(t, e) {
  return Ti(this.props, t) || Ti(this.state, e);
};
var Ri = x.__b;
x.__b = function(t) {
  t.type && t.type.__f && t.ref && (t.props.ref = t.ref, t.ref = null), Ri && Ri(t);
};
var Sr = x.__e;
x.__e = function(t, e, i, n) {
  if (t.then) {
    for (var r, o = e; o = o.__; ) if ((r = o.__c) && r.__c) return e.__e == null && (e.__e = i.__e, e.__k = i.__k), r.__c(t, e);
  }
  Sr(t, e, i, n);
};
var Oi = x.unmount;
function un(t, e, i) {
  return t && (t.__c && t.__c.__H && (t.__c.__H.__.forEach(function(n) {
    typeof n.__c == "function" && n.__c();
  }), t.__c.__H = null), (t = br({}, t)).__c != null && (t.__c.__P === i && (t.__c.__P = e), t.__c.__e = !0, t.__c = null), t.__k = t.__k && t.__k.map(function(n) {
    return un(n, e, i);
  })), t;
}
function hn(t, e, i) {
  return t && i && (t.__v = null, t.__k = t.__k && t.__k.map(function(n) {
    return hn(n, e, i);
  }), t.__c && t.__c.__P === e && (t.__e && i.appendChild(t.__e), t.__c.__e = !0, t.__c.__P = i)), t;
}
function vt() {
  this.__u = 0, this.o = null, this.__b = null;
}
function fn(t) {
  if (!t.__) return null;
  var e = t.__.__c;
  return e && e.__a && e.__a(t);
}
function Ze() {
  this.i = null, this.l = null;
}
x.unmount = function(t) {
  var e = t.__c;
  e && (e.__z = !0), e && e.__R && e.__R(), e && 32 & t.__u && (t.type = null), Oi && Oi(t);
}, (vt.prototype = new ue()).__c = function(t, e) {
  var i = e.__c, n = this;
  n.o == null && (n.o = []), n.o.push(i);
  var r = fn(n.__v), o = !1, a = function() {
    o || n.__z || (o = !0, i.__R = null, r ? r(u) : u());
  };
  i.__R = a;
  var l = i.__P;
  i.__P = null;
  var u = function() {
    if (!--n.__u) {
      if (n.state.__a) {
        var c = n.state.__a;
        n.__v.__k[0] = hn(c, c.__c.__P, c.__c.__O);
      }
      var h;
      for (n.setState({ __a: n.__b = null }); h = n.o.pop(); ) h.__P = l, h.forceUpdate();
    }
  };
  n.__u++ || 32 & e.__u || n.setState({ __a: n.__b = n.__v.__k[0] }), t.then(a, a);
}, vt.prototype.componentWillUnmount = function() {
  this.o = [];
}, vt.prototype.render = function(t, e) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), n = this.__v.__k[0].__c;
      this.__v.__k[0] = un(this.__b, i, n.__O = n.__P);
    }
    this.__b = null;
  }
  var r = e.__a && It(X, null, t.fallback);
  return r && (r.__u &= -33), [It(X, null, e.__a ? null : t.children), r];
};
var Pi = function(t, e, i) {
  if (++i[1] === i[0] && t.l.delete(e), t.props.revealOrder && (t.props.revealOrder[0] !== "t" || !t.l.size)) for (i = t.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    t.i = i = i[2];
  }
};
(Ze.prototype = new ue()).__a = function(t) {
  var e = this, i = fn(e.__v), n = e.l.get(t);
  return n[0]++, function(r) {
    var o = function() {
      e.props.revealOrder ? (n.push(r), Pi(e, t, n)) : r();
    };
    i ? i(o) : o();
  };
}, Ze.prototype.render = function(t) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var e = ct(t.children);
  t.revealOrder && t.revealOrder[0] === "b" && e.reverse();
  for (var i = e.length; i--; ) this.l.set(e[i], this.i = [1, 0, this.i]);
  return t.children;
}, Ze.prototype.componentDidUpdate = Ze.prototype.componentDidMount = function() {
  var t = this;
  this.l.forEach(function(e, i) {
    Pi(t, i, e);
  });
};
var wr = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, Er = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, Cr = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, xr = /[A-Z0-9]/g, Ir = typeof document < "u", Tr = function(t) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(t);
};
ue.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t) {
  Object.defineProperty(ue.prototype, t, { configurable: !0, get: function() {
    return this["UNSAFE_" + t];
  }, set: function(e) {
    Object.defineProperty(this, t, { configurable: !0, writable: !0, value: e });
  } });
});
var Ai = x.event;
function kr() {
}
function Rr() {
  return this.cancelBubble;
}
function Or() {
  return this.defaultPrevented;
}
x.event = function(t) {
  return Ai && (t = Ai(t)), t.persist = kr, t.isPropagationStopped = Rr, t.isDefaultPrevented = Or, t.nativeEvent = t;
};
var Pr = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, Li = x.vnode;
x.vnode = function(t) {
  typeof t.type == "string" && (function(e) {
    var i = e.props, n = e.type, r = {}, o = n.indexOf("-") === -1;
    for (var a in i) {
      var l = i[a];
      if (!(a === "value" && "defaultValue" in i && l == null || Ir && a === "children" && n === "noscript" || a === "class" || a === "className")) {
        var u = a.toLowerCase();
        a === "defaultValue" && "value" in i && i.value == null ? a = "value" : a === "download" && l === !0 ? l = "" : u === "translate" && l === "no" ? l = !1 : u[0] === "o" && u[1] === "n" ? u === "ondoubleclick" ? a = "ondblclick" : u !== "onchange" || n !== "input" && n !== "textarea" || Tr(i.type) ? u === "onfocus" ? a = "onfocusin" : u === "onblur" ? a = "onfocusout" : Cr.test(a) && (a = u) : u = a = "oninput" : o && Er.test(a) ? a = a.replace(xr, "-$&").toLowerCase() : l === null && (l = void 0), u === "oninput" && r[a = u] && (a = "oninputCapture"), r[a] = l;
      }
    }
    n == "select" && r.multiple && Array.isArray(r.value) && (r.value = ct(i.children).forEach(function(c) {
      c.props.selected = r.value.indexOf(c.props.value) != -1;
    })), n == "select" && r.defaultValue != null && (r.value = ct(i.children).forEach(function(c) {
      c.props.selected = r.multiple ? r.defaultValue.indexOf(c.props.value) != -1 : r.defaultValue == c.props.value;
    })), i.class && !i.className ? (r.class = i.class, Object.defineProperty(r, "className", Pr)) : (i.className && !i.class || i.class && i.className) && (r.class = r.className = i.className), e.props = r;
  })(t), t.$$typeof = wr, Li && Li(t);
};
var Di = x.__r;
x.__r = function(t) {
  Di && Di(t), t.__c;
};
var Mi = x.diffed;
x.diffed = function(t) {
  Mi && Mi(t);
  var e = t.props, i = t.__e;
  i != null && t.type === "textarea" && "value" in e && e.value !== i.value && (i.value = e.value == null ? "" : e.value);
};
var pn = Qt(
  void 0
), je = (t) => {
  const e = Jt(pn);
  if (!e)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return e;
}, Ar = ({
  client: t,
  children: e
}) => (q(() => (t.mount(), () => {
  t.unmount();
}), [t]), /* @__PURE__ */ s(pn.Provider, { value: t, children: e })), mn = Qt(!1), Lr = () => Jt(mn);
mn.Provider;
function Dr() {
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
var Mr = Qt(Dr()), Fr = () => Jt(Mr), Nr = (t, e, i) => {
  const n = i?.state.error && typeof t.throwOnError == "function" ? jt(t.throwOnError, [i.state.error, i]) : t.throwOnError;
  (t.suspense || t.experimental_prefetchInRender || n) && (e.isReset() || (t.retryOnMount = !1));
}, Ur = (t) => {
  q(() => {
    t.clearReset();
  }, [t]);
}, zr = ({
  result: t,
  errorResetBoundary: e,
  throwOnError: i,
  query: n,
  suspense: r
}) => t.isError && !e.isReset() && !t.isFetching && n && (r && t.data === void 0 || jt(i, [t.error, n])), Br = (t) => {
  if (t.suspense) {
    const i = (r) => r === "static" ? r : Math.max(r ?? 1e3, 1e3), n = t.staleTime;
    t.staleTime = typeof n == "function" ? (...r) => i(n(...r)) : i(n), typeof t.gcTime == "number" && (t.gcTime = Math.max(
      t.gcTime,
      1e3
    ));
  }
}, Hr = (t, e) => t.isLoading && t.isFetching && !e, $r = (t, e) => t?.suspense && e.isPending, Fi = (t, e, i) => e.fetchOptimistic(t).catch(() => {
  i.clearReset();
});
function Kr(t, e, i) {
  const n = Lr(), r = Fr(), o = je(), a = o.defaultQueryOptions(t);
  o.getDefaultOptions().queries?._experimental_beforeQuery?.(
    a
  );
  const l = o.getQueryCache().get(a.queryHash);
  a._optimisticResults = n ? "isRestoring" : "optimistic", Br(a), Nr(a, r, l), Ur(r);
  const u = !o.getQueryCache().get(a.queryHash), [c] = C(
    () => new e(
      o,
      a
    )
  ), h = c.getOptimisticResult(a), d = !n && t.subscribed !== !1;
  if (dn(
    se(
      (p) => {
        const m = d ? c.subscribe(H.batchCalls(p)) : Y;
        return c.updateResult(), m;
      },
      [c, d]
    ),
    () => c.getCurrentResult()
  ), q(() => {
    c.setOptions(a);
  }, [a, c]), $r(a, h))
    throw Fi(a, c, r);
  if (zr({
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
  ), a.experimental_prefetchInRender && !Te && Hr(h, n) && (u ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    Fi(a, c, r)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    l?.promise
  ))?.catch(Y).finally(() => {
    c.updateResult();
  }), a.notifyOnChangeProps ? h : c.trackResult(h);
}
function pt(t, e) {
  return Kr(t, ar);
}
function Oe(t, e) {
  const i = je(), [n] = C(
    () => new fr(
      i,
      t
    )
  );
  q(() => {
    n.setOptions(t);
  }, [n, t]);
  const r = dn(
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
  if (r.error && jt(n.options.throwOnError, [r.error]))
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
}, Wr = `
* { font-family: ${le}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function k({
  variant: t,
  children: e,
  onClick: i,
  type: n = "button",
  title: r,
  active: o = !1,
  style: a,
  class: l,
  disabled: u,
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
  }, d = a ? { ...h, ...a } : h;
  return /* @__PURE__ */ s(
    "button",
    {
      type: n,
      style: d,
      class: l,
      onClick: i,
      title: r,
      disabled: u,
      "aria-label": c,
      children: e
    }
  );
}
const Gr = "https://devgw.revgain.ai/rg-pex", gn = "designerIud";
function Qr() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(gn);
  } catch {
    return null;
  }
}
function et(t) {
  const e = {
    "Content-Type": "application/json",
    schema: "customer_1001",
    ...t
  }, i = Qr();
  return i && (e.iud = i), e;
}
const re = {
  baseUrl: Gr,
  async get(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, n = await fetch(i, {
      ...e,
      headers: { ...et(), ...e?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  },
  async post(t, e, i) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "POST",
      ...i,
      headers: { ...et(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async put(t, e, i) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "PUT",
      ...i,
      headers: { ...et(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async delete(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, n = await fetch(i, {
      method: "DELETE",
      ...e,
      headers: { ...et(), ...e?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  }
}, yn = (t) => ["guides", "byId", t];
async function qr(t) {
  const e = new URLSearchParams({ guide_id: t });
  return re.get(`/guides?${e.toString()}`);
}
function Vr(t) {
  return pt({
    queryKey: yn(t),
    queryFn: () => qr(t),
    enabled: !!t,
    retry: 0
  });
}
const jr = ["guides", "update"];
async function Yr({
  guideId: t,
  payload: e
}) {
  return re.put(`/guides/${t}`, e);
}
function Xr() {
  const t = je();
  return Oe({
    mutationKey: jr,
    mutationFn: Yr,
    onSuccess: (e, i) => {
      t.invalidateQueries({ queryKey: yn(i.guideId) });
    }
  });
}
const Nt = "Template", Ut = "Description", zt = "Next";
function Jr(t) {
  try {
    const e = JSON.parse(t || "{}");
    return {
      title: e.title ?? Nt,
      description: e.description ?? Ut,
      buttonContent: e.buttonContent ?? zt
    };
  } catch {
    return {
      title: Nt,
      description: Ut,
      buttonContent: zt
    };
  }
}
function Zr(t) {
  return t?.template_key ?? "";
}
const _n = {
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
function vn({
  title: t = Nt,
  description: e = Ut,
  buttonContent: i = zt
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
function es(t) {
  return /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", margin: "0 auto" }, children: /* @__PURE__ */ s("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 8, ..._n }, children: [
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
    /* @__PURE__ */ s(vn, { ...t })
  ] }) });
}
function ts(t) {
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
    /* @__PURE__ */ s("div", { style: { position: "relative", marginTop: 0, display: "flex", flexDirection: "column", gap: 8, ..._n }, children: [
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
      /* @__PURE__ */ s(vn, { ...t })
    ] })
  ] });
}
function is({
  item: t,
  selected: e = !1,
  onClick: i,
  disabled: n = !1
}) {
  const r = t.template, o = Mt(() => Zr(r), [r]), a = Mt(() => Jr(r.content), [r.content]);
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
          o === "tooltip-scratch" ? ts : es,
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
function ns({
  onMessage: t,
  elementSelected: e,
  guideId: i = null,
  templateId: n = null
}) {
  const [r, o] = C(""), [a, l] = C(void 0), [u, c] = C(null), [h, d] = C(""), [p, m] = C("right"), [v, _] = C(""), [E, S] = C(n ?? null), [b, F] = C(!1), [U, $] = C("on_click"), [L, N] = C(null), [I, P] = C(!1), { data: G, isLoading: D } = Vr(i), w = G?.data, K = w?.templates ?? [], J = Xr(), V = E ? K.find((O) => O.template_id === E) : null;
  q(() => {
    w && n && K.some((O) => O.template_id === n) && S(n);
  }, [w, n, K]), q(() => {
    t({ type: "EDITOR_READY" });
  }, []), q(() => {
    e ? b ? N({
      selector: e.selector,
      xpath: e.xpath,
      elementInfo: e.elementInfo
    }) : (o(e.selector), l(e.xpath), c(e.elementInfo), d(""), _("")) : b && N(null);
  }, [e, b]);
  const ve = () => {
    P(!1), o(""), l(void 0), c(null), d(""), _(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, fe = async () => {
    if (!w || !i) return;
    const O = We(), Q = a ?? (r && (r.startsWith("/") || r.startsWith("//")) ? r : null), Se = (w.steps ?? w.templates ?? []).slice().sort((A, ie) => A.step_order - ie.step_order).map((A) => ({
      template_id: A.template_id,
      step_order: A.step_order,
      url: A.template_id === E ? O : A.url ?? O,
      x_path: A.template_id === E ? Q : A.x_path
    })), ae = {
      guide_name: w.guide_name ?? "",
      description: w.description ?? "",
      target_segment: w.target_segment ?? null,
      guide_category: w.guide_category ?? null,
      target_page: w.target_page ?? O,
      type: w.type ?? "modal",
      status: w.status ?? "draft",
      priority: w.priority ?? 0,
      templates: Se
    };
    _("");
    try {
      await J.mutateAsync({ guideId: i, payload: ae }), ve();
    } catch (A) {
      const ie = A instanceof Error ? A.message : "Failed to update guide";
      _(ie);
    }
  }, be = async () => {
    if (!w || !i) return;
    const O = We(), Q = L?.xpath ?? (L?.selector?.startsWith("/") || L?.selector?.startsWith("//") ? L?.selector : null) ?? null, Se = (w.steps ?? w.templates ?? []).slice().sort((A, ie) => A.step_order - ie.step_order).map((A) => ({
      template_id: A.template_id,
      step_order: A.step_order,
      url: A.url ?? O,
      x_path: A.x_path
    })), ae = {
      guide_name: w.guide_name ?? "",
      description: w.description ?? "",
      target_segment: Q,
      guide_category: w.guide_category ?? null,
      target_page: O,
      type: w.type ?? "modal",
      status: w.status ?? "draft",
      priority: w.priority ?? 0,
      templates: Se
    };
    _("");
    try {
      await J.mutateAsync({ guideId: i, payload: ae }), ve();
    } catch (A) {
      const ie = A instanceof Error ? A.message : "Failed to update guide";
      _(ie);
    }
  }, oe = (O) => {
    const Q = [];
    return O.tagName && Q.push(`Tag: ${O.tagName}`), O.id && Q.push(`ID: ${O.id}`), O.className && Q.push(`Class: ${O.className}`), O.textContent && Q.push(`Text: ${O.textContent}`), Q.join(" | ");
  }, ee = !!i && !!w;
  return /* @__PURE__ */ s("div", { style: f.root, children: [
    /* @__PURE__ */ s("div", { style: f.header, children: [
      /* @__PURE__ */ s("h2", { style: f.headerTitle, children: ee ? w?.guide_name ?? "Guide" : "Create Guide" }),
      /* @__PURE__ */ s(k, { variant: "icon", onClick: () => t({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    b ? /* @__PURE__ */ s("div", { style: { ...f.section, paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ s(
        k,
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
      w?.target_segment && /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Current target segment" }),
        /* @__PURE__ */ s("div", { style: { ...f.selectorBox, marginTop: "0.5rem" }, title: w.target_segment, children: w.target_segment.length > 60 ? w.target_segment.slice(0, 60) + "…" : w.target_segment })
      ] }),
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Action" }),
        /* @__PURE__ */ s(
          "select",
          {
            value: U,
            onChange: (O) => $(O.target.value),
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
        L ? /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s("div", { style: { ...f.selectorBox, marginTop: "0.5rem" }, title: L.xpath ?? L.selector, children: (L.xpath ?? L.selector) || "-" }),
          L.elementInfo && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: [
            /* @__PURE__ */ s("strong", { style: f.elementInfoTitle, children: "Element Info" }),
            /* @__PURE__ */ s("div", { style: f.elementInfoText, children: oe(L.elementInfo) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              k,
              {
                variant: I ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  P(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              k,
              {
                variant: "secondary",
                style: I ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Hide Selector"
              }
            ),
            w?.target_segment && /* @__PURE__ */ s(
              k,
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
          k,
          {
            variant: I ? "primary" : "secondary",
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
        k,
        {
          variant: "primary",
          style: { flex: 1 },
          onClick: be,
          disabled: J.isPending,
          children: J.isPending ? "Updating…" : "Update Action"
        }
      ) }),
      v && /* @__PURE__ */ s("div", { style: f.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        v
      ] })
    ] }) : /* @__PURE__ */ s(X, { children: i && D ? /* @__PURE__ */ s("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "2rem", color: "#3b82f6" } }),
      /* @__PURE__ */ s("p", { style: f.emptyStateText, children: "Loading guide…" })
    ] }) : i && !w ? /* @__PURE__ */ s("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle", style: { fontSize: "2rem", color: "#94a3b8" } }),
      /* @__PURE__ */ s("p", { style: f.emptyStateText, children: "Guide not found." })
    ] }) : ee && K.length > 0 ? /* @__PURE__ */ s(X, { children: [
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
            children: K.sort((O, Q) => O.step_order - Q.step_order).map((O) => /* @__PURE__ */ s(
              is,
              {
                item: O,
                selected: E === O.template_id,
                onClick: () => S(O.template_id)
              },
              `${O.template_id}-${O.step_order}`
            ))
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Element for selected template" }),
        r ? /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s("div", { style: f.selectorBox, title: a ?? r, children: (a ?? r).length > 60 ? (a ?? r).slice(0, 60) + "…" : a ?? r }),
          u && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: [
            /* @__PURE__ */ s("strong", { style: f.elementInfoTitle, children: "Element Info" }),
            /* @__PURE__ */ s("div", { style: f.elementInfoText, children: oe(u) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              k,
              {
                variant: I ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  P(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              k,
              {
                variant: "secondary",
                style: I ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Hide Selector"
              }
            ),
            V?.x_path && /* @__PURE__ */ s(
              k,
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
            k,
            {
              variant: "primary",
              style: { flex: 1 },
              onClick: fe,
              disabled: J.isPending,
              children: J.isPending ? "Updating…" : "Update"
            }
          ) })
        ] }) : V?.x_path ? /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s("div", { style: f.selectorBox, title: V.x_path, children: V.x_path.length > 60 ? V.x_path.slice(0, 60) + "…" : V.x_path }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              k,
              {
                variant: I ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  P(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              k,
              {
                variant: "secondary",
                style: I ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Hide Selector"
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "1rem", borderTop: "none", paddingTop: 0 }, children: /* @__PURE__ */ s(
            k,
            {
              variant: "primary",
              style: { flex: 1 },
              onClick: fe,
              disabled: J.isPending,
              children: J.isPending ? "Updating…" : "Update"
            }
          ) })
        ] }) : /* @__PURE__ */ s(
          k,
          {
            variant: I ? "primary" : "secondary",
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
      /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ s(k, { variant: "primary", onClick: () => F(!0), children: "Next" }) }),
      ee && v && /* @__PURE__ */ s("div", { style: f.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        v
      ] })
    ] }) : null })
  ] });
}
function Be({
  type: t = "text",
  value: e,
  onInput: i,
  placeholder: n,
  id: r,
  style: o,
  disabled: a,
  "aria-label": l
}) {
  const u = o ? { ...f.input, ...o } : f.input;
  return /* @__PURE__ */ s(
    "input",
    {
      type: t,
      value: e,
      onInput: i,
      placeholder: n,
      id: r,
      style: u,
      disabled: a,
      "aria-label": l
    }
  );
}
function bn({
  value: t,
  onInput: e,
  placeholder: i,
  id: n,
  minHeight: r,
  style: o,
  disabled: a,
  "aria-label": l
}) {
  const u = o ? { ...f.textarea, ...o, ...r != null && { minHeight: typeof r == "number" ? `${r}px` : r } } : r != null ? { ...f.textarea, minHeight: typeof r == "number" ? `${r}px` : r } : f.textarea;
  return /* @__PURE__ */ s(
    "textarea",
    {
      value: t,
      onInput: e,
      placeholder: i,
      id: n,
      style: u,
      disabled: a,
      "aria-label": l
    }
  );
}
const rs = ["pages", "create"];
async function ss(t) {
  return re.post("/pages", {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: "active"
  });
}
function os() {
  return Oe({
    mutationKey: rs,
    mutationFn: ss
  });
}
const as = ["pages", "update"];
async function ls({ pageId: t, payload: e }) {
  return re.put(`/pages/${t}`, {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: e.status ?? "active"
  });
}
function cs() {
  return Oe({
    mutationKey: as,
    mutationFn: ls
  });
}
const ds = ["pages", "delete"];
async function us(t) {
  return re.delete(`/pages/${t}`);
}
function hs() {
  return Oe({
    mutationKey: ds,
    mutationFn: us
  });
}
const fs = (t) => ["pages", "check-slug", t];
async function ps(t) {
  return re.get(`/pages/check-slug?slug=${encodeURIComponent(t)}`);
}
function ms(t) {
  return pt({
    queryKey: fs(t),
    queryFn: () => ps(t),
    enabled: !!t,
    retry: 0
  });
}
const gs = ["pages", "list"];
async function ys() {
  return re.get("/pages");
}
function _s() {
  return pt({
    queryKey: gs,
    queryFn: ys,
    retry: 0
  });
}
const vs = "designerTaggedPages", tt = ["pages", "check-slug"], bt = ["pages", "list"];
function it() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (e.host || e.hostname || "") + (e.pathname || "/") + (e.search || "") + (e.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function nt() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (e.pathname || "/").replace(/^\//, ""), n = e.search || "", r = e.hash || "";
    return "//*/" + i + n + r;
  } catch {
    return "//*/";
  }
}
function bs({ onMessage: t }) {
  const [e, i] = C("overviewUntagged"), [n, r] = C(""), [o, a] = C(""), [l, u] = C(""), [c, h] = C(!1), [d, p] = C("create"), [m, v] = C(""), [_, E] = C(""), [S, b] = C("suggested"), [F, U] = C(""), [$, L] = C(!1), [N, I] = C(null), [P, G] = C(!1), D = je(), w = os(), K = cs(), J = hs(), { data: V, isLoading: ve, isError: fe } = ms(n), { data: be, isLoading: oe } = _s(), ee = !!n && ve, O = w.isPending || K.isPending, Q = (n || "").trim().toLowerCase(), ae = (be?.data ?? []).filter((T) => (T.slug || "").trim().toLowerCase() === Q).filter(
    (T) => (T.name || "").toLowerCase().includes(l.toLowerCase().trim())
  ), A = se(() => {
    i("overviewUntagged"), a(it() || "(current page)"), h(!1), D.invalidateQueries({ queryKey: tt });
  }, [D]), ie = se(() => {
    i("taggedPagesDetailView"), u("");
  }, []), Pe = se(() => {
    I(null), i("tagPageFormView"), h(!0), U(nt()), v(""), E(""), p("create"), b("suggested"), L(!1);
  }, []), mt = se((T) => {
    I(T.page_id), i("tagPageFormView"), h(!0), U(T.slug || nt()), v(T.name || ""), E(T.description || ""), p("create"), b("suggested"), L(!1);
  }, []);
  q(() => {
    t({ type: "EDITOR_READY" });
  }, []), q(() => {
    r(nt()), a(it() || "(current page)");
  }, []), q(() => {
    if (!n) {
      i("overviewUntagged");
      return;
    }
    if (fe) {
      (e === "overviewTagged" || e === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    V !== void 0 && (e === "overviewTagged" || e === "overviewUntagged") && i(V.exists ? "overviewTagged" : "overviewUntagged");
  }, [n, V, fe, e]), q(() => {
    let T = it();
    const pe = () => {
      const ge = it();
      ge !== T && (T = ge, r(nt()), a(ge || "(current page)"), i("overviewUntagged"));
    }, me = () => pe(), Ae = () => pe();
    window.addEventListener("hashchange", me), window.addEventListener("popstate", Ae);
    const Fe = setInterval(pe, 1500);
    return () => {
      window.removeEventListener("hashchange", me), window.removeEventListener("popstate", Ae), clearInterval(Fe);
    };
  }, []);
  const Ye = async () => {
    const T = m.trim();
    if (!T) {
      L(!0);
      return;
    }
    L(!1);
    const pe = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, me = F.trim() || pe || "/";
    try {
      if (N)
        await K.mutateAsync({
          pageId: N,
          payload: {
            name: T,
            slug: me,
            description: _.trim() || void 0,
            status: "active"
          }
        }), I(null), D.invalidateQueries({ queryKey: tt }), D.invalidateQueries({ queryKey: bt }), A();
      else {
        const Ae = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, Fe = F.trim() || Ae;
        await w.mutateAsync({
          name: T,
          slug: me,
          description: _.trim() || void 0
        });
        const ge = vs, gt = localStorage.getItem(ge) || "[]", y = JSON.parse(gt);
        y.push({ pageName: T, url: Fe }), localStorage.setItem(ge, JSON.stringify(y)), D.invalidateQueries({ queryKey: tt }), D.invalidateQueries({ queryKey: bt }), i("overviewTagged"), h(!1);
      }
    } catch {
    }
  }, ce = async (T) => {
    if (window.confirm("Delete this page?"))
      try {
        await J.mutateAsync(T), D.invalidateQueries({ queryKey: tt }), D.invalidateQueries({ queryKey: bt });
      } catch {
      }
  }, we = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return P ? /* @__PURE__ */ s("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(k, { variant: "icon", title: "Expand", onClick: () => G(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: f.panel, children: [
    /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(k, { variant: "icon", title: "Minimize", onClick: () => G(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: f.panelBody, children: [
      ee && (e === "overviewTagged" || e === "overviewUntagged") && /* @__PURE__ */ s("div", { style: { ...we, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Checking page…" })
      ] }),
      !ee && e === "overviewTagged" && /* @__PURE__ */ s("div", { style: we, children: [
        /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "1rem", cursor: "pointer" }, onClick: ie, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ s("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: o })
            ] })
          ] }),
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ s(k, { variant: "primary", style: { width: "100%" }, onClick: Pe, children: "Tag Page" })
      ] }),
      e === "taggedPagesDetailView" && /* @__PURE__ */ s("div", { style: we, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (T) => {
              T.preventDefault(), A();
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
            Be,
            {
              type: "text",
              placeholder: "Search Pages",
              value: l,
              onInput: (T) => u(T.target.value),
              style: f.searchInput
            }
          ),
          l && /* @__PURE__ */ s(k, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => u(""), children: "Clear" })
        ] }),
        oe ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ s("span", { children: "Loading pages…" })
        ] }) : ae.map((T) => /* @__PURE__ */ s("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: T.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ s(k, { variant: "iconSm", title: "Edit", onClick: () => mt(T), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ s(k, { variant: "iconSm", title: "Delete", onClick: () => ce(T.page_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, T.page_id)),
        /* @__PURE__ */ s(k, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: Pe, children: "Tag Page" })
      ] }),
      !ee && e === "overviewUntagged" && /* @__PURE__ */ s("div", { style: { ...we, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ s("div", { style: { ...f.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ s(k, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: Pe, children: "Tag Page" })
      ] }),
      e === "tagPageFormView" && /* @__PURE__ */ s("div", { style: { ...we, gap: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (T) => {
              T.preventDefault(), I(null), A(), h(!1);
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
              /* @__PURE__ */ s("input", { type: "radio", name: "pageSetup", value: "create", checked: d === "create", onChange: () => p("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create New Page" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "pageSetup", value: "merge", checked: d === "merge", onChange: () => p("merge"), style: { accentColor: "#3b82f6" } }),
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
                Be,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: m,
                  onInput: (T) => v(T.target.value)
                }
              ),
              $ && /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ s(
                bn,
                {
                  placeholder: "Click to add description",
                  value: _,
                  onInput: (T) => E(T.target.value),
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
            /* @__PURE__ */ s(k, { variant: "iconSm", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "suggested", checked: S === "suggested", onChange: () => b("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "exact", checked: S === "exact", onChange: () => b("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "builder", checked: S === "builder", onChange: () => b("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ s(Be, { type: "text", placeholder: "e.g. //*/path/to/page", value: F, onInput: (T) => U(T.target.value) })
          ] })
        ] })
      ] })
    ] }),
    c && /* @__PURE__ */ s("div", { style: f.footer, children: [
      /* @__PURE__ */ s(
        k,
        {
          variant: "secondary",
          onClick: () => {
            I(null), A();
          },
          disabled: O,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ s(k, { variant: "primary", style: { flex: 1 }, onClick: Ye, disabled: O, children: O ? /* @__PURE__ */ s(X, { children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        N ? "Updating…" : "Saving…"
      ] }) : N ? "Update" : "Save" })
    ] })
  ] });
}
const Ss = ["features", "create"];
async function ws(t) {
  return re.post("/features", t);
}
function Es() {
  return Oe({
    mutationKey: Ss,
    mutationFn: ws
  });
}
const Cs = ["features", "update"];
async function xs({
  featureId: t,
  payload: e
}) {
  return re.put(`/features/${t}`, e);
}
function Is() {
  return Oe({
    mutationKey: Cs,
    mutationFn: xs
  });
}
const Ts = ["features", "delete"];
async function ks(t) {
  return re.delete(`/features/${t}`);
}
function Rs() {
  return Oe({
    mutationKey: Ts,
    mutationFn: ks
  });
}
const ze = ["features", "list"];
async function Os() {
  const t = await re.get("/features");
  return Array.isArray(t) ? { data: t } : t;
}
function Ps() {
  return pt({
    queryKey: ze,
    queryFn: Os,
    retry: 0
  });
}
const Ni = "designerHeatmapEnabled";
function As({ onMessage: t, elementSelected: e }) {
  const [i, n] = C("overview"), [r, o] = C(!1), [a, l] = C(""), [u, c] = C(null), [h, d] = C(""), [p, m] = C(!1), [v, _] = C(!1), [E, S] = C(!1), [b, F] = C(!1), [U, $] = C(!1), [L, N] = C("create"), [I, P] = C("suggested"), [G, D] = C(""), [w, K] = C(""), [J, V] = C(null), [ve, fe] = C(null), [be, oe] = C(""), ee = je(), O = Es(), Q = Is(), Se = Rs(), { data: ae, isLoading: A } = Ps(), ie = O.isPending || Q.isPending || Se.isPending, Pe = ae?.data ?? [], mt = Pe.length, Ye = Pe.filter((y) => (y.name || "").toLowerCase().includes(be.toLowerCase().trim())).sort((y, Z) => (y.name || "").localeCompare(Z.name || "", void 0, { sensitivity: "base" })), ce = se(() => {
    n("overview"), o(!1), l(""), c(null), K(""), d(""), m(!1), V(null), oe(""), ee.invalidateQueries({ queryKey: ze });
  }, [ee]), we = se(() => {
    n("taggedList"), oe("");
  }, []), T = se((y) => y.rules?.find(
    (ye) => ye.selector_type === "xpath" && (ye.selector_value ?? "").trim() !== ""
  )?.selector_value ?? "", []), pe = se(
    (y) => {
      n("form"), o(!0), y ? (V(y.feature_id), d(y.name || ""), D(y.description || ""), K(T(y)), P("exact")) : (V(null), d(""), D(""), K(e?.xpath || ""), l(e?.selector || ""), c(e?.elementInfo || null)), m(!1);
    },
    [e, T]
  );
  q(() => {
    t({ type: "EDITOR_READY" });
  }, []), q(() => {
    t({ type: "FEATURES_FOR_HEATMAP", features: ae?.data ?? [] });
  }, [ae, t]), q(() => {
    const y = localStorage.getItem(Ni) === "true";
    _(y);
  }, []), q(() => {
    e ? (l(e.selector), c(e.elementInfo), K(e.xpath || ""), o(!0), n("form"), d(""), m(!1), N("create"), D(""), P("exact")) : ce();
  }, [e]);
  const me = () => {
    const y = !v;
    _(y);
    try {
      localStorage.setItem(Ni, String(y));
    } catch {
    }
    t({ type: "HEATMAP_TOGGLE", enabled: y });
  }, Ae = (y) => y.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""), Fe = async () => {
    const y = h.trim();
    if (!y) {
      m(!0);
      return;
    }
    m(!1);
    const Z = w || e?.xpath || "";
    if (I === "exact") {
      if (!Z) return;
      const ye = {
        name: y,
        slug: Ae(y),
        description: G.trim() || "",
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
        J ? (await Q.mutateAsync({ featureId: J, payload: ye }), ee.invalidateQueries({ queryKey: ze }), ce()) : (await O.mutateAsync(ye), ee.invalidateQueries({ queryKey: ze }), ce());
      } catch {
      }
      return;
    }
  }, ge = async (y) => {
    if (window.confirm("Delete this feature?")) {
      fe(y);
      try {
        await Se.mutateAsync(y), ee.invalidateQueries({ queryKey: ze }), J === y && (V(null), ce());
      } catch {
      } finally {
        fe(null);
      }
    }
  }, gt = (y) => {
    const Z = [];
    y.tagName && Z.push(`Tag: ${y.tagName}`), y.id && Z.push(`ID: ${y.id}`), y.className && Z.push(`Class: ${y.className}`);
    const ye = (y.textContent || "").slice(0, 80);
    return ye && Z.push(`Text: ${ye}`), Z.join(" | ");
  };
  return E ? /* @__PURE__ */ s("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: r ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(k, { variant: "icon", title: "Expand", onClick: () => S(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: f.panel, children: [
    /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(k, { variant: "icon", title: "Minimize", onClick: () => S(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: r ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ s("a", { href: "#", style: f.link, onClick: (y) => {
          y.preventDefault(), ce();
        }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: L === "create", onChange: () => N("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: L === "merge", onChange: () => N("merge"), style: { accentColor: "#3b82f6" } }),
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
                Be,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: h,
                  onInput: (y) => d(y.target.value)
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
                bn,
                {
                  placeholder: "Describe your Feature",
                  value: G,
                  onInput: (y) => D(y.target.value),
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
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: I === "suggested", onChange: () => P("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: I === "ruleBuilder", onChange: () => P("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: I === "customCss", onChange: () => P("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: I === "exact", onChange: () => P("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: I === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ s("div", { style: f.selectorBox, children: I === "exact" ? (e?.xpath ?? w) || "-" : (e?.selector ?? a) || "-" })
          ] }),
          u && /* @__PURE__ */ s("div", { style: { marginTop: "1rem" }, children: [
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
                onClick: () => $((y) => !y),
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
            U && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.elementInfoText, children: gt(u) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ s("div", { style: f.footer, children: [
        /* @__PURE__ */ s(k, { variant: "secondary", onClick: ce, children: "Cancel" }),
        /* @__PURE__ */ s(k, { variant: "primary", style: { flex: 1 }, onClick: Fe, disabled: ie, children: ie ? "Saving..." : "Save" })
      ] })
    ] }) : /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i === "taggedList" ? /* @__PURE__ */ s(X, { children: [
      /* @__PURE__ */ s(
        "a",
        {
          href: "#",
          style: f.link,
          onClick: (y) => {
            y.preventDefault(), ce();
          },
          children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
            " Back to overview"
          ]
        }
      ),
      /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: A ? "…" : Ye.length }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Tagged Features" })
      ] }),
      /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged features" }),
      /* @__PURE__ */ s("div", { style: f.searchWrap, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
        /* @__PURE__ */ s(
          Be,
          {
            type: "text",
            placeholder: "Search features",
            value: be,
            onInput: (y) => oe(y.target.value),
            style: f.searchInput
          }
        ),
        be && /* @__PURE__ */ s(k, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => oe(""), children: "Clear" })
      ] }),
      A ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Loading features…" })
      ] }) : Ye.map((y) => {
        const Z = ve === y.feature_id;
        return /* @__PURE__ */ s("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: y.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem", alignItems: "center" }, children: [
            /* @__PURE__ */ s(k, { variant: "iconSm", title: "Edit", onClick: () => pe(y), disabled: Z, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            Z ? /* @__PURE__ */ s("span", { style: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", color: "#64748b" } }) }) : /* @__PURE__ */ s(k, { variant: "iconSm", title: "Delete", onClick: () => ge(y.feature_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, y.feature_id);
      }),
      /* @__PURE__ */ s(k, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: () => pe(), children: "Tag Feature" })
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
      /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "0.75rem", cursor: "pointer" }, onClick: we, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: mt }),
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
              style: f.toggle(v),
              onClick: me,
              onKeyDown: (y) => y.key === "Enter" && me(),
              children: /* @__PURE__ */ s("span", { style: f.toggleThumb(v) })
            }
          ),
          /* @__PURE__ */ s(k, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          k,
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
          k,
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
const Ls = new mr({
  defaultOptions: { mutations: { retry: 0 } }
});
class Ds {
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
    const n = (o) => this.messageCallback?.(o), r = this.mode === "tag-page" ? /* @__PURE__ */ s(bs, { onMessage: n }) : this.mode === "tag-feature" ? /* @__PURE__ */ s(
      As,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    ) : /* @__PURE__ */ s(
      ns,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState,
        guideId: this.guideId,
        templateId: this.templateId
      }
    );
    De(
      /* @__PURE__ */ s(Ar, { client: Ls, children: r }),
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
  <style>${Wr}</style>
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
    const i = e.clientX - this.dragStartX, n = e.clientY - this.dragStartY, r = window.innerWidth, o = window.innerHeight, a = this.iframe.offsetWidth, l = Math.max(-a + 50, Math.min(i, r - 50)), u = Math.max(0, Math.min(n, o - 100));
    this.iframe.style.left = `${l}px`, this.iframe.style.top = `${u}px`, this.iframe.style.right = "auto", this.iframe.style.bottom = "auto", this.dragHandle.style.left = `${l}px`, this.dragHandle.style.top = `${u}px`;
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
const Ms = "visual-designer-guides", Ui = "1.0.0";
class Fs {
  storageKey;
  constructor(e = Ms) {
    this.storageKey = e;
  }
  getGuides() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const i = JSON.parse(e);
      return i.version !== Ui ? (this.clear(), []) : i.guides || [];
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
    const i = { guides: e, version: Ui };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(e) {
    return this.getGuides().find((i) => i.id === e) || null;
  }
}
function Ns({ onExit: t }) {
  const e = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: R.bg,
    border: `2px solid ${R.primary}`,
    borderRadius: R.borderRadius,
    color: R.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: R.fontFamily,
    cursor: "pointer",
    zIndex: String(R.zIndex.controls),
    boxShadow: R.shadow,
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
        i.currentTarget.style.background = R.primary, i.currentTarget.style.color = R.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = R.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = R.bg, i.currentTarget.style.color = R.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = R.shadow;
      },
      children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function Us() {
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
        border: `5px solid ${R.primary}`,
        pointerEvents: "none",
        zIndex: R.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function zs() {
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
        background: R.primary,
        color: R.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: R.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${R.primary}`,
        borderTop: "none",
        zIndex: R.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function Bs() {
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
        zIndex: R.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: R.fontFamily
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
                    borderTopColor: R.primary,
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
function Hs(t) {
  return /* @__PURE__ */ s(X, { children: [
    t.showExitButton && /* @__PURE__ */ s(Ns, { onExit: t.onExitEditor }),
    t.showRedBorder && /* @__PURE__ */ s(Us, {}),
    t.showBadge && /* @__PURE__ */ s(zs, {}),
    t.showLoading && /* @__PURE__ */ s(Bs, {})
  ] });
}
function $s(t, e) {
  De(/* @__PURE__ */ s(Hs, { ...e }), t);
}
class Sn {
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
  constructor(e = {}) {
    this.config = e, this.guideId = e.guideId ?? null, this.templateId = e.templateId ?? null, this.storage = new Fs(e.storageKey), this.editorMode = new Ln(), this.guideRenderer = new Kn(), this.featureHeatmapRenderer = new Gn(), this.editorFrame = new Ds();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((i) => this.config.onGuideDismissed?.(i)), this.shouldEnableEditorMode() ? (this.showLoading = !0, this.renderOverlays(), this.enableEditor()) : this.loadGuides(), this.heatmapEnabled = localStorage.getItem("designerHeatmapEnabled") === "true", this.renderFeatureHeatmap(), this.setupEventListeners();
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
    return this.storage.getGuidesByPage(We());
  }
  saveGuide(e) {
    const i = {
      ...e,
      id: On(),
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
      page: We()
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
    this.ensureSDKRoot(), this.sdkRoot && $s(this.sdkRoot, {
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
const ei = "1.0.0", wn = "rg-web-sdk", Ks = "web", Ws = 1, M = {
  VISITOR_ID: "__rg_visitor_id",
  ACCOUNT_ID: "__rg_account_id",
  SESSION_ID: "__rg_session_id",
  SESSION_START: "__rg_session_start",
  SESSION_LAST_ACTIVITY: "__rg_session_last_activity",
  EVENT_QUEUE: "__rg_event_queue",
  OPT_OUT: "__rg_opt_out",
  VISITOR_TRAITS: "__rg_visitor_traits",
  ACCOUNT_TRAITS: "__rg_account_traits"
}, Gs = {
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
}, Ce = {
  NAVIGATION: "navigation",
  ENGAGEMENT: "engagement",
  DIAGNOSTIC: "diagnostic"
}, He = {
  NORMAL: "normal",
  RAGE_CLICK: "rage_click",
  ERROR_CLICK: "error_click",
  U_TURN: "u_turn"
}, Ne = {
  rageClickThreshold: 3,
  rageClickWindow: 1e3,
  deadClickDelay: 300,
  errorClickWindow: 2e3,
  uturnThreshold: 5e3
}, St = [1e3, 2e3, 5e3, 1e4, 3e4], zi = 5, Qs = 1e3, qs = 100, Vs = {
  click: { limit: 100, window: 1e3 },
  scroll: { limit: 10, window: 1e3 },
  input: { limit: 50, window: 1e3 }
}, wt = {
  pageView: 100,
  scroll: 500
}, Ue = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
};
function $e() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (t) => {
    const e = Math.random() * 16 | 0;
    return (t === "x" ? e : e & 3 | 8).toString(16);
  });
}
function Ke() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function js() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function Ys() {
  const t = navigator.userAgent;
  return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(t) ? "tablet" : /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silfae|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(t) ? "mobile" : "desktop";
}
function Xs() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Chrome") > -1 && t.indexOf("Edg") === -1 ? (e = "Chrome", i = t.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Safari") > -1 && t.indexOf("Chrome") === -1 ? (e = "Safari", i = t.match(/Version\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Firefox") > -1 ? (e = "Firefox", i = t.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Edg") > -1 ? (e = "Edge", i = t.match(/Edg\/([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("MSIE") > -1 || t.indexOf("Trident") > -1) && (e = "Internet Explorer", i = t.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || "Unknown"), { browserName: e, browserVersion: i };
}
function Js() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Win") > -1 ? (e = "Windows", t.indexOf("Windows NT 10.0") > -1 ? i = "10" : t.indexOf("Windows NT 6.3") > -1 ? i = "8.1" : t.indexOf("Windows NT 6.2") > -1 ? i = "8" : t.indexOf("Windows NT 6.1") > -1 && (i = "7")) : t.indexOf("Mac") > -1 ? (e = "macOS", i = t.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : t.indexOf("Linux") > -1 ? e = "Linux" : t.indexOf("Android") > -1 ? (e = "Android", i = t.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("iOS") > -1 || t.indexOf("iPhone") > -1 || t.indexOf("iPad") > -1) && (e = "iOS", i = t.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), { osName: e, osVersion: i };
}
function Zs() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Unknown";
  }
}
function eo(t) {
  try {
    const e = new URL(t), i = {};
    return e.searchParams.forEach((n, r) => {
      i[r] = n;
    }), i;
  } catch {
    return {};
  }
}
function Bt(t, e = 200) {
  return t ? t.length > e ? t.substring(0, e) : t : null;
}
function Ht(t, ...e) {
  return Object.assign({}, t, ...e);
}
function Bi(t, e) {
  let i;
  return function(...r) {
    const o = () => {
      clearTimeout(i), t(...r);
    };
    clearTimeout(i), i = setTimeout(o, e);
  };
}
function to(t, e = null) {
  try {
    return JSON.parse(t);
  } catch {
    return e;
  }
}
function Et(t, e = null) {
  try {
    return JSON.stringify(t);
  } catch {
    return e;
  }
}
function g(t, ...e) {
  typeof console < "u" && console[t] && console[t]("[RG SDK]", ...e);
}
function io(t) {
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
function no(t) {
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
function ro(t) {
  if (!t) return null;
  const e = t.getAttribute("aria-label") || t.getAttribute("alt") || t.getAttribute("title") || (t.tagName === "INPUT" ? t.value : null) || t.textContent?.trim() || null;
  return Bt(e, 200);
}
function so(t) {
  if (!t) return !1;
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0";
}
class oo {
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
      const n = this._getStorage(), r = Et(i);
      return r ? (n ? n.setItem(e, r) : this.memoryStorage[e] = r, !0) : (g("warn", "Failed to serialize value for key:", e), !1);
    } catch (n) {
      if (n.name === "QuotaExceededError") {
        g("warn", "Storage quota exceeded, attempting cleanup"), this._cleanup();
        try {
          const r = this._getStorage();
          return r ? r.setItem(e, Et(i)) : this.memoryStorage[e] = Et(i), !0;
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
      return i ? n = i.getItem(e) : n = this.memoryStorage[e], n == null ? null : to(n, null);
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
class ao {
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
    e ? (this.visitorId = e, this.visitorTraits = i) : (this.visitorId = "anon_" + $e(), this._persistVisitor());
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
    this.sessionId = "sess_" + $e(), this.sessionStartTime = Ke(), this.sessionLastActivity = Ke(), this.sessionEventCount = 0, this._captureSessionProperties(), this._persistSession(), g("info", "New session created:", this.sessionId);
  }
  _captureSessionProperties() {
    const e = window.location.href, i = eo(e);
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
      this.visitorTraits = Ht(this.visitorTraits, r), this._persistVisitor();
    }
    if (i && i.id) {
      this.accountId && this.accountId !== i.id && g("info", `Account changed from ${this.accountId} to ${i.id}`), this.accountId = i.id;
      const { id: n, ...r } = i;
      this.accountTraits = Ht(this.accountTraits, r), this._persistAccount();
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
    this.storage.removeItem(M.VISITOR_ID), this.storage.removeItem(M.VISITOR_TRAITS), this.storage.removeItem(M.ACCOUNT_ID), this.storage.removeItem(M.ACCOUNT_TRAITS), this.storage.removeItem(M.SESSION_ID), this.storage.removeItem(M.SESSION_START), this.storage.removeItem(M.SESSION_LAST_ACTIVITY), this.visitorId = "anon_" + $e(), this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this._createNewSession(), this._persistVisitor(), g("info", "Identity reset");
  }
}
class lo {
  constructor(e) {
    this.identityManager = e, this.deviceInfo = this._captureDeviceInfo();
  }
  _captureDeviceInfo() {
    const { browserName: e, browserVersion: i } = Xs(), { osName: n, osVersion: r } = Js();
    return {
      device_type: Ys(),
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
      timezone: Zs()
    };
  }
  buildEvent(e) {
    const i = Ke(), n = this.identityManager.getIdentityContext(), r = {
      event_id: "evt_" + $e(),
      visitor_id: n.visitor_id,
      account_id: n.account_id,
      session_id: n.session_id,
      event_name: e.event_name,
      event_type: e.event_type,
      timestamp: i,
      event_date: js(),
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
      sdk_version: ei,
      sdk_name: wn,
      sdk_source: Ks,
      data_version: Ws,
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
class co {
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
    i = i.replace(Ue.email, "[EMAIL_REDACTED]"), i = i.replace(Ue.phone, "[PHONE_REDACTED]"), i = i.replace(Ue.ssn, "[SSN_REDACTED]"), i = i.replace(Ue.creditCard, "[CC_REDACTED]"), i = i.replace(Ue.ipAddress, "[IP_REDACTED]");
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
    return e.element_text && (e.element_text = Bt(e.element_text, 100)), e.error_stack && (e.error_stack = Bt(e.error_stack, 500)), e.console_logs && (e.console_logs = e.console_logs.slice(0, 5)), e.custom_properties && JSON.stringify(e.custom_properties).length > 5e3 && (e.custom_properties = { _truncated: !0 }), e;
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
class uo {
  constructor() {
    this.clickHistory = [], this.deadClickTimers = /* @__PURE__ */ new Map(), this.recentErrors = [], this.navigationHistory = [], this._setupErrorListener(), this._setupNavigationListener();
  }
  detectClickInteraction(e, i) {
    const n = this._getElementKey(e), r = Date.now();
    return this._detectRageClick(n, r) ? He.RAGE_CLICK : this._detectErrorClick(n, r) ? He.ERROR_CLICK : (this._scheduleDeadClickCheck(e, n, r), He.NORMAL);
  }
  detectUTurn() {
    const e = Date.now(), i = this.navigationHistory;
    if (i.length < 2) return !1;
    const n = i[i.length - 1], r = i[i.length - 2];
    return n.url === r.url && e - r.time < Ne.uturnThreshold;
  }
  _detectRageClick(e, i) {
    return this.clickHistory.push({ elementKey: e, time: i }), this.clickHistory = this.clickHistory.filter(
      (r) => i - r.time < Ne.rageClickWindow
    ), this.clickHistory.filter(
      (r) => r.elementKey === e
    ).length >= Ne.rageClickThreshold;
  }
  _detectErrorClick(e, i) {
    return this.recentErrors = this.recentErrors.filter(
      (n) => i - n.time < Ne.errorClickWindow
    ), this.recentErrors.length > 0;
  }
  _scheduleDeadClickCheck(e, i, n) {
    this.deadClickTimers.has(i) && clearTimeout(this.deadClickTimers.get(i));
    const r = setTimeout(() => {
      this._isDeadClick(e, n) && g("debug", "Dead click detected:", i), this.deadClickTimers.delete(i);
    }, Ne.deadClickDelay);
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
class ho {
  constructor(e, i, n) {
    this.eventBuilder = e, this.privacyEngine = i, this.config = n, this.listeners = [], this.lastPageViewTime = 0, this.lastPageViewUrl = null, this.scrollMilestones = {
      25: !1,
      50: !1,
      75: !1,
      100: !1
    }, this.rateLimiters = {}, this.onEventCapture = null, this.isRunning = !1, this.behavioralDetector = new uo();
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
    const i = Vs[e];
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
    const e = history.pushState, i = history.replaceState, n = Bi(() => this._capturePageView(), wt.pageView);
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
    if (e - this.lastPageViewTime < wt.pageView || i === this.lastPageViewUrl)
      return;
    this.lastPageViewTime = e, this.lastPageViewUrl = i, this.scrollMilestones = { 25: !1, 50: !1, 75: !1, 100: !1 };
    const n = this.behavioralDetector.detectUTurn();
    this._emit({
      event_name: Ee.PAGE_VIEW,
      event_type: Ce.NAVIGATION,
      interaction_type: n ? He.U_TURN : He.NORMAL
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
    if (!so(i))
      return;
    const n = this.behavioralDetector.detectClickInteraction(i, e), r = {
      event_name: Ee.CLICK,
      event_type: Ce.ENGAGEMENT,
      element_id: i.id || null,
      element_class: i.classList ? Array.from(i.classList) : [],
      element_tag: i.tagName?.toLowerCase() || null,
      element_text: ro(i),
      element_href: i.href || i.closest("a")?.href || null,
      element_xpath: io(i),
      element_selector: no(i),
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
      event_type: Ce.ENGAGEMENT,
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
    const e = Bi(() => this._handleScroll(), wt.scroll);
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
      event_type: Ce.ENGAGEMENT,
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
      event_type: Ce.DIAGNOSTIC,
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
      event_type: Ce.DIAGNOSTIC,
      error_message: i?.message || String(i),
      error_type: i?.name || "UnhandledRejection",
      error_stack: i?.stack || null
    });
  }
  capturePage(e, i = {}) {
    this._emit({
      event_name: Ee.PAGE_VIEW,
      event_type: Ce.NAVIGATION,
      custom_properties: { page_name: e, ...i }
    });
  }
}
class fo {
  constructor(e) {
    this.storage = e, this.queue = [], this.maxSize = Qs, this.maxPersistedSize = qs, this._restore();
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
class po {
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
      batch_id: "batch_" + $e(),
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
      "X-RG-SDK-Version": ei,
      "X-RG-SDK-Name": wn
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
    if (i >= zi) {
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
      `Scheduling retry ${i + 1}/${zi} for batch ${e.batch_id} in ${n}ms`
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
class mo {
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
    this.config = Ht(Gs, e), g("info", "Initializing RG SDK...", {
      version: ei,
      config: this.config
    }), this._initializeModules(), this.initialized = !0, this.pendingIdentify && (this.identify(this.pendingIdentify.visitor, this.pendingIdentify.account), this.pendingIdentify = null), g("info", "RG SDK initialized successfully");
  }
  _initializeModules() {
    this.storage = new oo(this.config.persistence), this.identityManager = new ao(this.storage, this.config), this.identityManager.initialize(), this.eventBuilder = new lo(this.identityManager), this.privacyEngine = new co(this.storage, this.config), this.eventQueue = new fo(this.storage), this.transportLayer = new po(this.config, this.eventQueue), this.transportLayer.start(), this.autoCaptureEngine = new ho(
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
const j = new mo(), te = {
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
typeof window < "u" && (window.rg = te);
let W = null, En = !1;
const Cn = "designerGuideId", xn = "designerTemplateId";
let In = null, Tn = null;
function go() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(Cn) : null;
  } catch {
    return null;
  }
}
function yo() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(xn) : null;
  } catch {
    return null;
  }
}
function he(t) {
  return t?.apiKey ? te.initialize(t) : console.warn("[Revgain] No apiKey found in config. Analytics will not start."), W || (W = new Sn({
    ...t,
    guideId: In ?? t?.guideId ?? go() ?? null,
    templateId: Tn ?? t?.templateId ?? yo() ?? null
  }), W.init(), W);
}
function ti(t, e) {
  te.identify(t, e);
}
function ii(t, e) {
  te.track(t, e);
}
function ot() {
  return W;
}
function kn(t) {
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
          ti(r[0], r[1]);
          break;
        case "track":
          ii(r[0], r[1]);
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
          typeof te[n] == "function" ? te[n](...r) : console.warn("[Revgain] Unknown snippet method:", n);
      }
    } catch (o) {
      console.error("[Revgain] Error processing queued call:", n, o);
    }
  });
}
if (typeof window < "u") {
  const t = window.revgain || window.visualDesigner;
  t && Array.isArray(t._q) && (En = !0, t.init = he, t.initialize = he, t.identify = ti, t.track = ii, t.enableEditor = () => (W ?? he()).enableEditor(), t.disableEditor = () => W?.disableEditor(), t.loadGuides = () => W?.loadGuides(), t.getGuides = () => W?.getGuides(), t.getInstance = ot, t.page = (e, i) => te.page(e, i), t.flush = () => te.flush(), t.reset = () => te.reset(), kn(t._q));
  try {
    const e = new URL(window.location.href), i = e.searchParams.get("designer"), n = e.searchParams.get("mode"), r = e.searchParams.get("iud"), o = e.searchParams.get("guide_id"), a = e.searchParams.get("template_id");
    (i === "true" || o != null || a != null) && console.log("[Revgain] URL params detected:", { designerParam: i, modeParam: n, guideIdParam: o }), i === "true" && (n && (window.__visualDesignerMode = n, localStorage.setItem("designerModeType", n)), localStorage.setItem("designerMode", "true"), r && localStorage.setItem(gn, r), o != null && (In = o, localStorage.setItem(Cn, o)), a != null && (Tn = a, localStorage.setItem(xn, a)), e.searchParams.delete("designer"), e.searchParams.delete("mode"), e.searchParams.delete("iud"), e.searchParams.delete("guide_id"), e.searchParams.delete("template_id"), window.history.replaceState({}, "", e.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !W && !En) {
  const t = localStorage.getItem("designerMode") === "true", e = () => {
    !W && t && he();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
if (typeof window < "u") {
  const t = {
    init: he,
    initialize: he,
    identify: ti,
    track: ii,
    page: (e, i) => te.page(e, i),
    flush: () => te.flush(),
    reset: () => te.reset(),
    getInstance: ot,
    DesignerSDK: Sn,
    apiClient: re,
    _processQueue: kn,
    getGuideId: () => ot()?.getGuideId() ?? null,
    getTemplateId: () => ot()?.getTemplateId() ?? null,
    enableEditor: () => (W ?? he()).enableEditor(),
    disableEditor: () => W?.disableEditor(),
    analytics: te
  };
  window.revgain = t, window.VisualDesigner = t;
}
export {
  Sn as DesignerSDK,
  kn as _processQueue,
  re as apiClient,
  ot as getInstance,
  ti as identify,
  he as init,
  te as rg,
  ii as track
};
