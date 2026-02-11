class Me {
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
    const o = this.generateAriaSelector(t);
    if (o)
      return { selector: o, confidence: "medium", method: "aria" };
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
  static findElement(t) {
    try {
      if (t.startsWith("/") || t.startsWith("//"))
        return this.findElementByXPath(t);
      const i = this.parseContainsAndDescendant(t);
      if (i) {
        const r = this.findElementWithContains(i.anchorPart);
        if (!r) return null;
        if (i.descendantPart) {
          const o = r.querySelector(i.descendantPart);
          return o || null;
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
    const n = t.indexOf(i[0]) + i[0].length, r = t.slice(n), o = r.indexOf(" > ");
    return o === -1 ? null : {
      anchorPart: t.slice(0, n + o).trim(),
      descendantPart: r.slice(o + 3).trim() || null
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
    const n = i[1].trim(), r = i[2].replace(/\\'/g, "'"), o = this.normalizeText(r), a = document.querySelectorAll(n);
    for (let l = 0; l < a.length; l++)
      if (this.normalizeText(a[l].textContent || "").includes(o)) return a[l];
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
      const o = t.attributes[r];
      o.name.startsWith("data-") && !n.includes(o.name) && n.push(o.name);
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
  static normalizeText(t) {
    return (t || "").trim().replace(/\s+/g, " ");
  }
  /** Single segment: tag + classes + nth-of-type (no id) */
  static buildSegment(t) {
    let i = t.tagName.toLowerCase();
    if (t.className && typeof t.className == "string") {
      const r = t.className.split(/\s+/).filter((o) => o && !o.startsWith("designer-")).slice(0, 2);
      r.length > 0 && (i += "." + r.map((o) => this.escapeSelector(o)).join("."));
    }
    const n = t.parentElement;
    if (n) {
      const r = Array.from(n.children).filter((o) => o.tagName === t.tagName);
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
    const { anchor: n, hasId: r } = i, o = this.getPathFromAncestorToElement(n, t);
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
  static escapeSelector(t) {
    return typeof CSS < "u" && CSS.escape ? CSS.escape(t) : t.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }
  static escapeAttribute(t) {
    return t.replace(/"/g, '\\"').replace(/'/g, "\\'");
  }
}
function cn(e) {
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
function Wt(e) {
  const t = window.getComputedStyle(e);
  return t.display !== "none" && t.visibility !== "hidden" && t.opacity !== "0" && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().width > 0;
}
function Ae() {
  return window.location.pathname || "/";
}
function dn() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function un(e) {
  const t = e.getBoundingClientRect();
  return t.top >= 0 && t.left >= 0 && t.bottom <= (window.innerHeight || document.documentElement.clientHeight) && t.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function Gt(e) {
  un(e) || e.scrollIntoView({ behavior: "smooth", block: "center" });
}
const Kt = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class hn {
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
      if (i.closest(Kt)) {
        this.hideHighlight();
        return;
      }
      if (!Wt(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (t) => {
    if (!this.isActive) return;
    const i = t.target;
    i && (i.closest(Kt) || (t.preventDefault(), t.stopPropagation(), t.stopImmediatePropagation(), Wt(i) && this.selectElement(i)));
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
    const i = Me.generateSelector(t), n = cn(t), r = Me.getXPath(t);
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
var it, E, ki, ve, Qt, Ii, Pi, Ri, Rt, dt, ut, Oi, Le = {}, Fi = [], fn = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, ze = Array.isArray;
function oe(e, t) {
  for (var i in t) e[i] = t[i];
  return e;
}
function Ot(e) {
  e && e.parentNode && e.parentNode.removeChild(e);
}
function ht(e, t, i) {
  var n, r, o, a = {};
  for (o in t) o == "key" ? n = t[o] : o == "ref" ? r = t[o] : a[o] = t[o];
  if (arguments.length > 2 && (a.children = arguments.length > 3 ? it.call(arguments, 2) : i), typeof e == "function" && e.defaultProps != null) for (o in e.defaultProps) a[o] === void 0 && (a[o] = e.defaultProps[o]);
  return Ve(e, a, n, r, null);
}
function Ve(e, t, i, n, r) {
  var o = { type: e, props: t, key: i, ref: n, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: r ?? ++ki, __i: -1, __u: 0 };
  return r == null && E.vnode != null && E.vnode(o), o;
}
function q(e) {
  return e.children;
}
function ae(e, t) {
  this.props = e, this.context = t;
}
function Pe(e, t) {
  if (t == null) return e.__ ? Pe(e.__, e.__i + 1) : null;
  for (var i; t < e.__k.length; t++) if ((i = e.__k[t]) != null && i.__e != null) return i.__e;
  return typeof e.type == "function" ? Pe(e) : null;
}
function Di(e) {
  var t, i;
  if ((e = e.__) != null && e.__c != null) {
    for (e.__e = e.__c.base = null, t = 0; t < e.__k.length; t++) if ((i = e.__k[t]) != null && i.__e != null) {
      e.__e = e.__c.base = i.__e;
      break;
    }
    return Di(e);
  }
}
function ft(e) {
  (!e.__d && (e.__d = !0) && ve.push(e) && !Xe.__r++ || Qt != E.debounceRendering) && ((Qt = E.debounceRendering) || Ii)(Xe);
}
function Xe() {
  for (var e, t, i, n, r, o, a, l = 1; ve.length; ) ve.length > l && ve.sort(Pi), e = ve.shift(), l = ve.length, e.__d && (i = void 0, n = void 0, r = (n = (t = e).__v).__e, o = [], a = [], t.__P && ((i = oe({}, n)).__v = n.__v + 1, E.vnode && E.vnode(i), Ft(t.__P, i, n, t.__n, t.__P.namespaceURI, 32 & n.__u ? [r] : null, o, r ?? Pe(n), !!(32 & n.__u), a), i.__v = n.__v, i.__.__k[i.__i] = i, Li(o, i, a), n.__e = n.__ = null, i.__e != r && Di(i)));
  Xe.__r = 0;
}
function Mi(e, t, i, n, r, o, a, l, u, c, h) {
  var d, p, m, _, y, S, b, v = n && n.__k || Fi, M = t.length;
  for (u = pn(i, t, v, u, M), d = 0; d < M; d++) (m = i.__k[d]) != null && (p = m.__i == -1 ? Le : v[m.__i] || Le, m.__i = d, S = Ft(e, m, p, r, o, a, l, u, c, h), _ = m.__e, m.ref && p.ref != m.ref && (p.ref && Dt(p.ref, null, m), h.push(m.ref, m.__c || _, m)), y == null && _ != null && (y = _), (b = !!(4 & m.__u)) || p.__k === m.__k ? u = Ai(m, u, e, b) : typeof m.type == "function" && S !== void 0 ? u = S : _ && (u = _.nextSibling), m.__u &= -7);
  return i.__e = y, u;
}
function pn(e, t, i, n, r) {
  var o, a, l, u, c, h = i.length, d = h, p = 0;
  for (e.__k = new Array(r), o = 0; o < r; o++) (a = t[o]) != null && typeof a != "boolean" && typeof a != "function" ? (typeof a == "string" || typeof a == "number" || typeof a == "bigint" || a.constructor == String ? a = e.__k[o] = Ve(null, a, null, null, null) : ze(a) ? a = e.__k[o] = Ve(q, { children: a }, null, null, null) : a.constructor === void 0 && a.__b > 0 ? a = e.__k[o] = Ve(a.type, a.props, a.key, a.ref ? a.ref : null, a.__v) : e.__k[o] = a, u = o + p, a.__ = e, a.__b = e.__b + 1, l = null, (c = a.__i = mn(a, i, u, d)) != -1 && (d--, (l = i[c]) && (l.__u |= 2)), l == null || l.__v == null ? (c == -1 && (r > h ? p-- : r < h && p++), typeof a.type != "function" && (a.__u |= 4)) : c != u && (c == u - 1 ? p-- : c == u + 1 ? p++ : (c > u ? p-- : p++, a.__u |= 4))) : e.__k[o] = null;
  if (d) for (o = 0; o < h; o++) (l = i[o]) != null && (2 & l.__u) == 0 && (l.__e == n && (n = Pe(l)), zi(l, l));
  return n;
}
function Ai(e, t, i, n) {
  var r, o;
  if (typeof e.type == "function") {
    for (r = e.__k, o = 0; r && o < r.length; o++) r[o] && (r[o].__ = e, t = Ai(r[o], t, i, n));
    return t;
  }
  e.__e != t && (n && (t && e.type && !t.parentNode && (t = Pe(e)), i.insertBefore(e.__e, t || null)), t = e.__e);
  do
    t = t && t.nextSibling;
  while (t != null && t.nodeType == 8);
  return t;
}
function Je(e, t) {
  return t = t || [], e == null || typeof e == "boolean" || (ze(e) ? e.some(function(i) {
    Je(i, t);
  }) : t.push(e)), t;
}
function mn(e, t, i, n) {
  var r, o, a, l = e.key, u = e.type, c = t[i], h = c != null && (2 & c.__u) == 0;
  if (c === null && l == null || h && l == c.key && u == c.type) return i;
  if (n > (h ? 1 : 0)) {
    for (r = i - 1, o = i + 1; r >= 0 || o < t.length; ) if ((c = t[a = r >= 0 ? r-- : o++]) != null && (2 & c.__u) == 0 && l == c.key && u == c.type) return a;
  }
  return -1;
}
function jt(e, t, i) {
  t[0] == "-" ? e.setProperty(t, i ?? "") : e[t] = i == null ? "" : typeof i != "number" || fn.test(t) ? i : i + "px";
}
function Ne(e, t, i, n, r) {
  var o, a;
  e: if (t == "style") if (typeof i == "string") e.style.cssText = i;
  else {
    if (typeof n == "string" && (e.style.cssText = n = ""), n) for (t in n) i && t in i || jt(e.style, t, "");
    if (i) for (t in i) n && i[t] == n[t] || jt(e.style, t, i[t]);
  }
  else if (t[0] == "o" && t[1] == "n") o = t != (t = t.replace(Ri, "$1")), a = t.toLowerCase(), t = a in e || t == "onFocusOut" || t == "onFocusIn" ? a.slice(2) : t.slice(2), e.l || (e.l = {}), e.l[t + o] = i, i ? n ? i.u = n.u : (i.u = Rt, e.addEventListener(t, o ? ut : dt, o)) : e.removeEventListener(t, o ? ut : dt, o);
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
function qt(e) {
  return function(t) {
    if (this.l) {
      var i = this.l[t.type + e];
      if (t.t == null) t.t = Rt++;
      else if (t.t < i.u) return;
      return i(E.event ? E.event(t) : t);
    }
  };
}
function Ft(e, t, i, n, r, o, a, l, u, c) {
  var h, d, p, m, _, y, S, b, v, M, L, B, F, A, C, R, N, D = t.type;
  if (t.constructor !== void 0) return null;
  128 & i.__u && (u = !!(32 & i.__u), o = [l = t.__e = i.__e]), (h = E.__b) && h(t);
  e: if (typeof D == "function") try {
    if (b = t.props, v = "prototype" in D && D.prototype.render, M = (h = D.contextType) && n[h.__c], L = h ? M ? M.props.value : h.__ : n, i.__c ? S = (d = t.__c = i.__c).__ = d.__E : (v ? t.__c = d = new D(b, L) : (t.__c = d = new ae(b, L), d.constructor = D, d.render = yn), M && M.sub(d), d.state || (d.state = {}), d.__n = n, p = d.__d = !0, d.__h = [], d._sb = []), v && d.__s == null && (d.__s = d.state), v && D.getDerivedStateFromProps != null && (d.__s == d.state && (d.__s = oe({}, d.__s)), oe(d.__s, D.getDerivedStateFromProps(b, d.__s))), m = d.props, _ = d.state, d.__v = t, p) v && D.getDerivedStateFromProps == null && d.componentWillMount != null && d.componentWillMount(), v && d.componentDidMount != null && d.__h.push(d.componentDidMount);
    else {
      if (v && D.getDerivedStateFromProps == null && b !== m && d.componentWillReceiveProps != null && d.componentWillReceiveProps(b, L), t.__v == i.__v || !d.__e && d.shouldComponentUpdate != null && d.shouldComponentUpdate(b, d.__s, L) === !1) {
        for (t.__v != i.__v && (d.props = b, d.state = d.__s, d.__d = !1), t.__e = i.__e, t.__k = i.__k, t.__k.some(function(w) {
          w && (w.__ = t);
        }), B = 0; B < d._sb.length; B++) d.__h.push(d._sb[B]);
        d._sb = [], d.__h.length && a.push(d);
        break e;
      }
      d.componentWillUpdate != null && d.componentWillUpdate(b, d.__s, L), v && d.componentDidUpdate != null && d.__h.push(function() {
        d.componentDidUpdate(m, _, y);
      });
    }
    if (d.context = L, d.props = b, d.__P = e, d.__e = !1, F = E.__r, A = 0, v) {
      for (d.state = d.__s, d.__d = !1, F && F(t), h = d.render(d.props, d.state, d.context), C = 0; C < d._sb.length; C++) d.__h.push(d._sb[C]);
      d._sb = [];
    } else do
      d.__d = !1, F && F(t), h = d.render(d.props, d.state, d.context), d.state = d.__s;
    while (d.__d && ++A < 25);
    d.state = d.__s, d.getChildContext != null && (n = oe(oe({}, n), d.getChildContext())), v && !p && d.getSnapshotBeforeUpdate != null && (y = d.getSnapshotBeforeUpdate(m, _)), R = h, h != null && h.type === q && h.key == null && (R = Ui(h.props.children)), l = Mi(e, ze(R) ? R : [R], t, i, n, r, o, a, l, u, c), d.base = t.__e, t.__u &= -161, d.__h.length && a.push(d), S && (d.__E = d.__ = null);
  } catch (w) {
    if (t.__v = null, u || o != null) if (w.then) {
      for (t.__u |= u ? 160 : 128; l && l.nodeType == 8 && l.nextSibling; ) l = l.nextSibling;
      o[o.indexOf(l)] = null, t.__e = l;
    } else {
      for (N = o.length; N--; ) Ot(o[N]);
      pt(t);
    }
    else t.__e = i.__e, t.__k = i.__k, w.then || pt(t);
    E.__e(w, t, i);
  }
  else o == null && t.__v == i.__v ? (t.__k = i.__k, t.__e = i.__e) : l = t.__e = gn(i.__e, t, i, n, r, o, a, u, c);
  return (h = E.diffed) && h(t), 128 & t.__u ? void 0 : l;
}
function pt(e) {
  e && e.__c && (e.__c.__e = !0), e && e.__k && e.__k.forEach(pt);
}
function Li(e, t, i) {
  for (var n = 0; n < i.length; n++) Dt(i[n], i[++n], i[++n]);
  E.__c && E.__c(t, e), e.some(function(r) {
    try {
      e = r.__h, r.__h = [], e.some(function(o) {
        o.call(r);
      });
    } catch (o) {
      E.__e(o, r.__v);
    }
  });
}
function Ui(e) {
  return typeof e != "object" || e == null || e.__b && e.__b > 0 ? e : ze(e) ? e.map(Ui) : oe({}, e);
}
function gn(e, t, i, n, r, o, a, l, u) {
  var c, h, d, p, m, _, y, S = i.props || Le, b = t.props, v = t.type;
  if (v == "svg" ? r = "http://www.w3.org/2000/svg" : v == "math" ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), o != null) {
    for (c = 0; c < o.length; c++) if ((m = o[c]) && "setAttribute" in m == !!v && (v ? m.localName == v : m.nodeType == 3)) {
      e = m, o[c] = null;
      break;
    }
  }
  if (e == null) {
    if (v == null) return document.createTextNode(b);
    e = document.createElementNS(r, v, b.is && b), l && (E.__m && E.__m(t, o), l = !1), o = null;
  }
  if (v == null) S === b || l && e.data == b || (e.data = b);
  else {
    if (o = o && it.call(e.childNodes), !l && o != null) for (S = {}, c = 0; c < e.attributes.length; c++) S[(m = e.attributes[c]).name] = m.value;
    for (c in S) if (m = S[c], c != "children") {
      if (c == "dangerouslySetInnerHTML") d = m;
      else if (!(c in b)) {
        if (c == "value" && "defaultValue" in b || c == "checked" && "defaultChecked" in b) continue;
        Ne(e, c, null, m, r);
      }
    }
    for (c in b) m = b[c], c == "children" ? p = m : c == "dangerouslySetInnerHTML" ? h = m : c == "value" ? _ = m : c == "checked" ? y = m : l && typeof m != "function" || S[c] === m || Ne(e, c, m, S[c], r);
    if (h) l || d && (h.__html == d.__html || h.__html == e.innerHTML) || (e.innerHTML = h.__html), t.__k = [];
    else if (d && (e.innerHTML = ""), Mi(t.type == "template" ? e.content : e, ze(p) ? p : [p], t, i, n, v == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r, o, a, o ? o[0] : i.__k && Pe(i, 0), l, u), o != null) for (c = o.length; c--; ) Ot(o[c]);
    l || (c = "value", v == "progress" && _ == null ? e.removeAttribute("value") : _ != null && (_ !== e[c] || v == "progress" && !_ || v == "option" && _ != S[c]) && Ne(e, c, _, S[c], r), c = "checked", y != null && y != e[c] && Ne(e, c, y, S[c], r));
  }
  return e;
}
function Dt(e, t, i) {
  try {
    if (typeof e == "function") {
      var n = typeof e.__u == "function";
      n && e.__u(), n && t == null || (e.__u = e(t));
    } else e.current = t;
  } catch (r) {
    E.__e(r, i);
  }
}
function zi(e, t, i) {
  var n, r;
  if (E.unmount && E.unmount(e), (n = e.ref) && (n.current && n.current != e.__e || Dt(n, null, t)), (n = e.__c) != null) {
    if (n.componentWillUnmount) try {
      n.componentWillUnmount();
    } catch (o) {
      E.__e(o, t);
    }
    n.base = n.__P = null;
  }
  if (n = e.__k) for (r = 0; r < n.length; r++) n[r] && zi(n[r], t, i || typeof e.type != "function");
  i || Ot(e.__e), e.__c = e.__ = e.__e = void 0;
}
function yn(e, t, i) {
  return this.constructor(e, i);
}
function we(e, t, i) {
  var n, r, o, a;
  t == document && (t = document.documentElement), E.__ && E.__(e, t), r = (n = !1) ? null : t.__k, o = [], a = [], Ft(t, e = t.__k = ht(q, null, [e]), r || Le, Le, t.namespaceURI, r ? null : t.firstChild ? it.call(t.childNodes) : null, o, r ? r.__e : t.firstChild, n, a), Li(o, e, a);
}
function Mt(e) {
  function t(i) {
    var n, r;
    return this.getChildContext || (n = /* @__PURE__ */ new Set(), (r = {})[t.__c] = this, this.getChildContext = function() {
      return r;
    }, this.componentWillUnmount = function() {
      n = null;
    }, this.shouldComponentUpdate = function(o) {
      this.props.value != o.value && n.forEach(function(a) {
        a.__e = !0, ft(a);
      });
    }, this.sub = function(o) {
      n.add(o);
      var a = o.componentWillUnmount;
      o.componentWillUnmount = function() {
        n && n.delete(o), a && a.call(o);
      };
    }), i.children;
  }
  return t.__c = "__cC" + Oi++, t.__ = e, t.Provider = t.__l = (t.Consumer = function(i, n) {
    return i.children(n);
  }).contextType = t, t;
}
it = Fi.slice, E = { __e: function(e, t, i, n) {
  for (var r, o, a; t = t.__; ) if ((r = t.__c) && !r.__) try {
    if ((o = r.constructor) && o.getDerivedStateFromError != null && (r.setState(o.getDerivedStateFromError(e)), a = r.__d), r.componentDidCatch != null && (r.componentDidCatch(e, n || {}), a = r.__d), a) return r.__E = r;
  } catch (l) {
    e = l;
  }
  throw e;
} }, ki = 0, ae.prototype.setState = function(e, t) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = oe({}, this.state), typeof e == "function" && (e = e(oe({}, i), this.props)), e && oe(i, e), e != null && this.__v && (t && this._sb.push(t), ft(this));
}, ae.prototype.forceUpdate = function(e) {
  this.__v && (this.__e = !0, e && this.__h.push(e), ft(this));
}, ae.prototype.render = q, ve = [], Ii = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, Pi = function(e, t) {
  return e.__v.__b - t.__v.__b;
}, Xe.__r = 0, Ri = /(PointerCapture)$|Capture$/i, Rt = 0, dt = qt(!1), ut = qt(!0), Oi = 0;
var _n = 0;
function s(e, t, i, n, r, o) {
  t || (t = {});
  var a, l, u = t;
  if ("ref" in u) for (l in u = {}, t) l == "ref" ? a = t[l] : u[l] = t[l];
  var c = { type: e, props: u, key: i, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --_n, __i: -1, __u: 0, __source: r, __self: o };
  if (typeof e == "function" && (a = e.defaultProps)) for (l in a) u[l] === void 0 && (u[l] = a[l]);
  return E.vnode && E.vnode(c), c;
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
function vn({ guide: e, top: t, left: i, arrowStyle: n, onDismiss: r }) {
  return /* @__PURE__ */ s(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": e.id,
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
        top: `${t}px`,
        left: `${i}px`,
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ s("div", { style: { marginBottom: 8 }, children: e.content }),
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
function bn(e) {
  const t = { position: "absolute" };
  switch (e) {
    case "top":
      return { ...t, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${I.primary} transparent transparent transparent` };
    case "bottom":
      return { ...t, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${I.primary} transparent` };
    case "left":
      return { ...t, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${I.primary}` };
    default:
      return { ...t, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${I.primary} transparent transparent` };
  }
}
function Vt(e, t, i, n) {
  const r = e.getBoundingClientRect(), o = window.pageXOffset || document.documentElement.scrollLeft, a = window.pageYOffset || document.documentElement.scrollTop, l = window.innerWidth, u = window.innerHeight;
  let c = 0, h = 0;
  switch (t) {
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
  return h < o ? h = o + 10 : h + i > o + l && (h = o + l - i - 10), c < a ? c = a + 10 : c + n > a + u && (c = a + u - n - 10), { top: c, left: h, arrowStyle: bn(t) };
}
class wn {
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
    const i = Ae(), n = t.filter(
      (o) => o.status === "active" && !this.dismissedThisSession.has(o.id)
    ), r = [];
    for (const o of n) {
      const a = o.steps || o.templates || [];
      if (a.length > 0) {
        for (const l of a)
          if (!(!l.is_active || !l.url || !l.x_path) && (i.includes(l.url) || l.url.includes(i))) {
            const u = Me.findElement(l.x_path);
            if (u) {
              Gt(u);
              const c = Vt(u, "right", 280, 80);
              r.push({
                guide: o,
                target: u,
                pos: c,
                stepContent: l.template?.content
              });
            }
          }
      } else if ((o.page === i || o.target_page === i) && o.selector) {
        const l = Me.findElement(o.selector);
        if (l) {
          Gt(l);
          const u = Vt(l, o.placement, 280, 80);
          r.push({ guide: o, target: l, pos: u });
        }
      }
    }
    if (r.length === 0) {
      this.container && we(null, this.container);
      return;
    }
    this.ensureContainer(), this.container && we(
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
          children: r.map(({ guide: o, pos: a, stepContent: l }, u) => /* @__PURE__ */ s(
            vn,
            {
              guide: {
                ...o,
                content: l || o.content
              },
              top: a.top,
              left: a.left,
              arrowStyle: a.arrowStyle,
              onDismiss: () => this.dismissGuide(o.id)
            },
            `${o.id}-${u}`
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
    this.dismissedThisSession.clear(), this.container && we(null, this.container);
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
const Yt = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function Sn({ feature: e, color: t, rect: i }) {
  return /* @__PURE__ */ s(
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
        zIndex: I.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${t}`
      }
    }
  );
}
class xn {
  container = null;
  lastEnabled = !1;
  render(t, i) {
    if (this.lastEnabled = i, this.clear(), !i || t.length === 0) return;
    const n = t.filter((o) => (o.selector || "").trim() !== "");
    if (this.ensureContainer(), !this.container) return;
    const r = n.map((o, a) => {
      const l = Me.findElement(o.selector);
      if (!l) return null;
      const u = l.getBoundingClientRect(), c = Yt[a % Yt.length];
      return { feature: o, rect: u, color: c };
    }).filter(Boolean);
    r.length !== 0 && we(
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
            Sn,
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
  updatePositions(t) {
    this.render(t, this.lastEnabled);
  }
  clear() {
    this.container && we(null, this.container);
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
var Re = class {
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
}, En = {
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
}, Cn = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = En;
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
}, be = new Cn();
function Tn(e) {
  setTimeout(e, 0);
}
var Se = typeof window > "u" || "Deno" in globalThis;
function j() {
}
function kn(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function mt(e) {
  return typeof e == "number" && e >= 0 && e !== 1 / 0;
}
function Hi(e, t) {
  return Math.max(e + (t || 0) - Date.now(), 0);
}
function fe(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function ee(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function Xt(e, t) {
  const {
    type: i = "all",
    exact: n,
    fetchStatus: r,
    predicate: o,
    queryKey: a,
    stale: l
  } = e;
  if (a) {
    if (n) {
      if (t.queryHash !== At(a, t.options))
        return !1;
    } else if (!Ue(t.queryKey, a))
      return !1;
  }
  if (i !== "all") {
    const u = t.isActive();
    if (i === "active" && !u || i === "inactive" && u)
      return !1;
  }
  return !(typeof l == "boolean" && t.isStale() !== l || r && r !== t.state.fetchStatus || o && !o(t));
}
function Jt(e, t) {
  const { exact: i, status: n, predicate: r, mutationKey: o } = e;
  if (o) {
    if (!t.options.mutationKey)
      return !1;
    if (i) {
      if (xe(t.options.mutationKey) !== xe(o))
        return !1;
    } else if (!Ue(t.options.mutationKey, o))
      return !1;
  }
  return !(n && t.state.status !== n || r && !r(t));
}
function At(e, t) {
  return (t?.queryKeyHashFn || xe)(e);
}
function xe(e) {
  return JSON.stringify(
    e,
    (t, i) => gt(i) ? Object.keys(i).sort().reduce((n, r) => (n[r] = i[r], n), {}) : i
  );
}
function Ue(e, t) {
  return e === t ? !0 : typeof e != typeof t ? !1 : e && t && typeof e == "object" && typeof t == "object" ? Object.keys(t).every((i) => Ue(e[i], t[i])) : !1;
}
var In = Object.prototype.hasOwnProperty;
function Bi(e, t, i = 0) {
  if (e === t)
    return e;
  if (i > 500) return t;
  const n = Zt(e) && Zt(t);
  if (!n && !(gt(e) && gt(t))) return t;
  const o = (n ? e : Object.keys(e)).length, a = n ? t : Object.keys(t), l = a.length, u = n ? new Array(l) : {};
  let c = 0;
  for (let h = 0; h < l; h++) {
    const d = n ? h : a[h], p = e[d], m = t[d];
    if (p === m) {
      u[d] = p, (n ? h < o : In.call(e, d)) && c++;
      continue;
    }
    if (p === null || m === null || typeof p != "object" || typeof m != "object") {
      u[d] = m;
      continue;
    }
    const _ = Bi(p, m, i + 1);
    u[d] = _, _ === p && c++;
  }
  return o === l && c === o ? e : u;
}
function Ze(e, t) {
  if (!t || Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const i in e)
    if (e[i] !== t[i])
      return !1;
  return !0;
}
function Zt(e) {
  return Array.isArray(e) && e.length === Object.keys(e).length;
}
function gt(e) {
  if (!ei(e))
    return !1;
  const t = e.constructor;
  if (t === void 0)
    return !0;
  const i = t.prototype;
  return !(!ei(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(e) !== Object.prototype);
}
function ei(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function Pn(e) {
  return new Promise((t) => {
    be.setTimeout(t, e);
  });
}
function yt(e, t, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(e, t) : i.structuralSharing !== !1 ? Bi(e, t) : t;
}
function Rn(e, t, i = 0) {
  const n = [...e, t];
  return i && n.length > i ? n.slice(1) : n;
}
function On(e, t, i = 0) {
  const n = [t, ...e];
  return i && n.length > i ? n.slice(0, -1) : n;
}
var Lt = /* @__PURE__ */ Symbol();
function $i(e, t) {
  return !e.queryFn && t?.initialPromise ? () => t.initialPromise : !e.queryFn || e.queryFn === Lt ? () => Promise.reject(new Error(`Missing queryFn: '${e.queryHash}'`)) : e.queryFn;
}
function Ut(e, t) {
  return typeof e == "function" ? e(...t) : !!e;
}
function Fn(e, t, i) {
  let n = !1, r;
  return Object.defineProperty(e, "signal", {
    enumerable: !0,
    get: () => (r ??= t(), n || (n = !0, r.aborted ? i() : r.addEventListener("abort", i, { once: !0 })), r)
  }), e;
}
var Dn = class extends Re {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (e) => {
      if (!Se && window.addEventListener) {
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
}, zt = new Dn();
function _t() {
  let e, t;
  const i = new Promise((r, o) => {
    e = r, t = o;
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
var Mn = Tn;
function An() {
  let e = [], t = 0, i = (l) => {
    l();
  }, n = (l) => {
    l();
  }, r = Mn;
  const o = (l) => {
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
var H = An(), Ln = class extends Re {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (e) => {
      if (!Se && window.addEventListener) {
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
}, et = new Ln();
function Un(e) {
  return Math.min(1e3 * 2 ** e, 3e4);
}
function Ni(e) {
  return (e ?? "online") === "online" ? et.isOnline() : !0;
}
var vt = class extends Error {
  constructor(e) {
    super("CancelledError"), this.revert = e?.revert, this.silent = e?.silent;
  }
};
function Wi(e) {
  let t = !1, i = 0, n;
  const r = _t(), o = () => r.status !== "pending", a = (y) => {
    if (!o()) {
      const S = new vt(y);
      p(S), e.onCancel?.(S);
    }
  }, l = () => {
    t = !0;
  }, u = () => {
    t = !1;
  }, c = () => zt.isFocused() && (e.networkMode === "always" || et.isOnline()) && e.canRun(), h = () => Ni(e.networkMode) && e.canRun(), d = (y) => {
    o() || (n?.(), r.resolve(y));
  }, p = (y) => {
    o() || (n?.(), r.reject(y));
  }, m = () => new Promise((y) => {
    n = (S) => {
      (o() || c()) && y(S);
    }, e.onPause?.();
  }).then(() => {
    n = void 0, o() || e.onContinue?.();
  }), _ = () => {
    if (o())
      return;
    let y;
    const S = i === 0 ? e.initialPromise : void 0;
    try {
      y = S ?? e.fn();
    } catch (b) {
      y = Promise.reject(b);
    }
    Promise.resolve(y).then(d).catch((b) => {
      if (o())
        return;
      const v = e.retry ?? (Se ? 0 : 3), M = e.retryDelay ?? Un, L = typeof M == "function" ? M(i, b) : M, B = v === !0 || typeof v == "number" && i < v || typeof v == "function" && v(i, b);
      if (t || !B) {
        p(b);
        return;
      }
      i++, e.onFail?.(i, b), Pn(L).then(() => c() ? void 0 : m()).then(() => {
        t ? p(b) : _();
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
    start: () => (h() ? _() : m().then(_), r)
  };
}
var Gi = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), mt(this.gcTime) && (this.#e = be.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(e) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      e ?? (Se ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (be.clearTimeout(this.#e), this.#e = void 0);
  }
}, zn = class extends Gi {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(e) {
    super(), this.#a = !1, this.#o = e.defaultOptions, this.setOptions(e.options), this.observers = [], this.#r = e.client, this.#i = this.#r.getQueryCache(), this.queryKey = e.queryKey, this.queryHash = e.queryHash, this.#e = ii(this.options), this.state = e.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(e) {
    if (this.options = { ...this.#o, ...e }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const t = ii(this.options);
      t.data !== void 0 && (this.setState(
        ti(t.data, t.dataUpdatedAt)
      ), this.#e = t);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(e, t) {
    const i = yt(this.state.data, e, this.options);
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
    return this.#n?.cancel(e), t ? t.then(j).catch(j) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({ silent: !0 });
  }
  reset() {
    this.destroy(), this.setState(this.#e);
  }
  isActive() {
    return this.observers.some(
      (e) => ee(e.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === Lt || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (e) => fe(e.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (e) => e.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(e = 0) {
    return this.state.data === void 0 ? !0 : e === "static" ? !1 : this.state.isInvalidated ? !0 : !Hi(this.state.dataUpdatedAt, e);
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
      const l = $i(this.options, t), c = (() => {
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
    this.options.behavior?.onFetch(a, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#s({ type: "fetch", meta: a.fetchOptions?.meta }), this.#n = Wi({
      initialPromise: t?.initialPromise,
      fn: a.fetchFn,
      onCancel: (l) => {
        l instanceof vt && l.revert && this.setState({
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
      if (l instanceof vt) {
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
            ...Ki(i.data, this.options),
            fetchMeta: e.meta ?? null
          };
        case "success":
          const n = {
            ...i,
            ...ti(e.data, e.dataUpdatedAt),
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
    this.state = t(this.state), H.batch(() => {
      this.observers.forEach((i) => {
        i.onQueryUpdate();
      }), this.#i.notify({ query: this, type: "updated", action: e });
    });
  }
};
function Ki(e, t) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: Ni(t.networkMode) ? "fetching" : "paused",
    ...e === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function ti(e, t) {
  return {
    data: e,
    dataUpdatedAt: t ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function ii(e) {
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
var Hn = class extends Re {
  constructor(e, t) {
    super(), this.options = t, this.#e = e, this.#s = null, this.#a = _t(), this.bindMethods(), this.setOptions(t);
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
    this.listeners.size === 1 && (this.#t.addObserver(this), ni(this.#t, this.options) ? this.#u() : this.updateResult(), this.#v());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return bt(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return bt(
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
    if (this.options = this.#e.defaultQueryOptions(e), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof ee(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), t._defaulted && !Ze(this.options, t) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const n = this.hasListeners();
    n && ri(
      this.#t,
      i,
      this.options,
      t
    ) && this.#u(), this.updateResult(), n && (this.#t !== i || ee(this.options.enabled, this.#t) !== ee(t.enabled, this.#t) || fe(this.options.staleTime, this.#t) !== fe(t.staleTime, this.#t)) && this.#g();
    const r = this.#y();
    n && (this.#t !== i || ee(this.options.enabled, this.#t) !== ee(t.enabled, this.#t) || r !== this.#l) && this.#_(r);
  }
  getOptimisticResult(e) {
    const t = this.#e.getQueryCache().build(this.#e, e), i = this.createResult(t, e);
    return $n(this, i) && (this.#r = i, this.#o = this.options, this.#n = this.#t.state), i;
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
    return e?.throwOnError || (t = t.catch(j)), t;
  }
  #g() {
    this.#b();
    const e = fe(
      this.options.staleTime,
      this.#t
    );
    if (Se || this.#r.isStale || !mt(e))
      return;
    const i = Hi(this.#r.dataUpdatedAt, e) + 1;
    this.#c = be.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(e) {
    this.#w(), this.#l = e, !(Se || ee(this.options.enabled, this.#t) === !1 || !mt(this.#l) || this.#l === 0) && (this.#d = be.setInterval(() => {
      (this.options.refetchIntervalInBackground || zt.isFocused()) && this.#u();
    }, this.#l));
  }
  #v() {
    this.#g(), this.#_(this.#y());
  }
  #b() {
    this.#c && (be.clearTimeout(this.#c), this.#c = void 0);
  }
  #w() {
    this.#d && (be.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(e, t) {
    const i = this.#t, n = this.options, r = this.#r, o = this.#n, a = this.#o, u = e !== i ? e.state : this.#i, { state: c } = e;
    let h = { ...c }, d = !1, p;
    if (t._optimisticResults) {
      const C = this.hasListeners(), R = !C && ni(e, t), N = C && ri(e, i, t, n);
      (R || N) && (h = {
        ...h,
        ...Ki(c.data, e.options)
      }), t._optimisticResults === "isRestoring" && (h.fetchStatus = "idle");
    }
    let { error: m, errorUpdatedAt: _, status: y } = h;
    p = h.data;
    let S = !1;
    if (t.placeholderData !== void 0 && p === void 0 && y === "pending") {
      let C;
      r?.isPlaceholderData && t.placeholderData === a?.placeholderData ? (C = r.data, S = !0) : C = typeof t.placeholderData == "function" ? t.placeholderData(
        this.#f?.state.data,
        this.#f
      ) : t.placeholderData, C !== void 0 && (y = "success", p = yt(
        r?.data,
        C,
        t
      ), d = !0);
    }
    if (t.select && p !== void 0 && !S)
      if (r && p === o?.data && t.select === this.#m)
        p = this.#h;
      else
        try {
          this.#m = t.select, p = t.select(p), p = yt(r?.data, p, t), this.#h = p, this.#s = null;
        } catch (C) {
          this.#s = C;
        }
    this.#s && (m = this.#s, p = this.#h, _ = Date.now(), y = "error");
    const b = h.fetchStatus === "fetching", v = y === "pending", M = y === "error", L = v && b, B = p !== void 0, A = {
      status: y,
      fetchStatus: h.fetchStatus,
      isPending: v,
      isSuccess: y === "success",
      isError: M,
      isInitialLoading: L,
      isLoading: L,
      data: p,
      dataUpdatedAt: h.dataUpdatedAt,
      error: m,
      errorUpdatedAt: _,
      failureCount: h.fetchFailureCount,
      failureReason: h.fetchFailureReason,
      errorUpdateCount: h.errorUpdateCount,
      isFetched: h.dataUpdateCount > 0 || h.errorUpdateCount > 0,
      isFetchedAfterMount: h.dataUpdateCount > u.dataUpdateCount || h.errorUpdateCount > u.errorUpdateCount,
      isFetching: b,
      isRefetching: b && !v,
      isLoadingError: M && !B,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: d,
      isRefetchError: M && B,
      isStale: Ht(e, t),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: ee(t.enabled, e) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const C = A.data !== void 0, R = A.status === "error" && !C, N = ($) => {
        R ? $.reject(A.error) : C && $.resolve(A.data);
      }, D = () => {
        const $ = this.#a = A.promise = _t();
        N($);
      }, w = this.#a;
      switch (w.status) {
        case "pending":
          e.queryHash === i.queryHash && N(w);
          break;
        case "fulfilled":
          (R || A.data !== w.value) && D();
          break;
        case "rejected":
          (!R || A.error !== w.reason) && D();
          break;
      }
    }
    return A;
  }
  updateResult() {
    const e = this.#r, t = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#f = this.#t), Ze(t, e))
      return;
    this.#r = t;
    const i = () => {
      if (!e)
        return !0;
      const { notifyOnChangeProps: n } = this.options, r = typeof n == "function" ? n() : n;
      if (r === "all" || !r && !this.#p.size)
        return !0;
      const o = new Set(
        r ?? this.#p
      );
      return this.options.throwOnError && o.add("error"), Object.keys(this.#r).some((a) => {
        const l = a;
        return this.#r[l] !== e[l] && o.has(l);
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
    H.batch(() => {
      e.listeners && this.listeners.forEach((t) => {
        t(this.#r);
      }), this.#e.getQueryCache().notify({
        query: this.#t,
        type: "observerResultsUpdated"
      });
    });
  }
};
function Bn(e, t) {
  return ee(t.enabled, e) !== !1 && e.state.data === void 0 && !(e.state.status === "error" && t.retryOnMount === !1);
}
function ni(e, t) {
  return Bn(e, t) || e.state.data !== void 0 && bt(e, t, t.refetchOnMount);
}
function bt(e, t, i) {
  if (ee(t.enabled, e) !== !1 && fe(t.staleTime, e) !== "static") {
    const n = typeof i == "function" ? i(e) : i;
    return n === "always" || n !== !1 && Ht(e, t);
  }
  return !1;
}
function ri(e, t, i, n) {
  return (e !== t || ee(n.enabled, e) === !1) && (!i.suspense || e.state.status !== "error") && Ht(e, i);
}
function Ht(e, t) {
  return ee(t.enabled, e) !== !1 && e.isStaleByTime(fe(t.staleTime, e));
}
function $n(e, t) {
  return !Ze(e.getCurrentResult(), t);
}
function si(e) {
  return {
    onFetch: (t, i) => {
      const n = t.options, r = t.fetchOptions?.meta?.fetchMore?.direction, o = t.state.data?.pages || [], a = t.state.data?.pageParams || [];
      let l = { pages: [], pageParams: [] }, u = 0;
      const c = async () => {
        let h = !1;
        const d = (_) => {
          Fn(
            _,
            () => t.signal,
            () => h = !0
          );
        }, p = $i(t.options, t.fetchOptions), m = async (_, y, S) => {
          if (h)
            return Promise.reject();
          if (y == null && _.pages.length)
            return Promise.resolve(_);
          const v = (() => {
            const F = {
              client: t.client,
              queryKey: t.queryKey,
              pageParam: y,
              direction: S ? "backward" : "forward",
              meta: t.options.meta
            };
            return d(F), F;
          })(), M = await p(v), { maxPages: L } = t.options, B = S ? On : Rn;
          return {
            pages: B(_.pages, M, L),
            pageParams: B(_.pageParams, y, L)
          };
        };
        if (r && o.length) {
          const _ = r === "backward", y = _ ? Nn : oi, S = {
            pages: o,
            pageParams: a
          }, b = y(n, S);
          l = await m(S, b, _);
        } else {
          const _ = e ?? o.length;
          do {
            const y = u === 0 ? a[0] ?? n.initialPageParam : oi(n, l);
            if (u > 0 && y == null)
              break;
            l = await m(l, y), u++;
          } while (u < _);
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
function oi(e, { pages: t, pageParams: i }) {
  const n = t.length - 1;
  return t.length > 0 ? e.getNextPageParam(
    t[n],
    t,
    i[n],
    i
  ) : void 0;
}
function Nn(e, { pages: t, pageParams: i }) {
  return t.length > 0 ? e.getPreviousPageParam?.(t[0], t, i[0], i) : void 0;
}
var Wn = class extends Gi {
  #e;
  #t;
  #i;
  #r;
  constructor(e) {
    super(), this.#e = e.client, this.mutationId = e.mutationId, this.#i = e.mutationCache, this.#t = [], this.state = e.state || Qi(), this.setOptions(e.options), this.scheduleGc();
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
    this.#r = Wi({
      fn: () => this.options.mutationFn ? this.options.mutationFn(e, i) : Promise.reject(new Error("No mutationFn found")),
      onFail: (o, a) => {
        this.#n({ type: "failed", failureCount: o, error: a });
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
      const o = await this.#r.start();
      return await this.#i.config.onSuccess?.(
        o,
        e,
        this.state.context,
        this,
        i
      ), await this.options.onSuccess?.(
        o,
        e,
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
        e,
        this.state.context,
        i
      ), this.#n({ type: "success", data: o }), o;
    } catch (o) {
      try {
        await this.#i.config.onError?.(
          o,
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
          o,
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
          e,
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
    this.state = t(this.state), H.batch(() => {
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
function Qi() {
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
var Gn = class extends Re {
  constructor(e = {}) {
    super(), this.config = e, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(e, t, i) {
    const n = new Wn({
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
    const t = We(e);
    if (typeof t == "string") {
      const i = this.#t.get(t);
      i ? i.push(e) : this.#t.set(t, [e]);
    }
    this.notify({ type: "added", mutation: e });
  }
  remove(e) {
    if (this.#e.delete(e)) {
      const t = We(e);
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
    const t = We(e);
    if (typeof t == "string") {
      const n = this.#t.get(t)?.find(
        (r) => r.state.status === "pending"
      );
      return !n || n === e;
    } else
      return !0;
  }
  runNext(e) {
    const t = We(e);
    return typeof t == "string" ? this.#t.get(t)?.find((n) => n !== e && n.state.isPaused)?.continue() ?? Promise.resolve() : Promise.resolve();
  }
  clear() {
    H.batch(() => {
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
      (i) => Jt(t, i)
    );
  }
  findAll(e = {}) {
    return this.getAll().filter((t) => Jt(e, t));
  }
  notify(e) {
    H.batch(() => {
      this.listeners.forEach((t) => {
        t(e);
      });
    });
  }
  resumePausedMutations() {
    const e = this.getAll().filter((t) => t.state.isPaused);
    return H.batch(
      () => Promise.all(
        e.map((t) => t.continue().catch(j))
      )
    );
  }
};
function We(e) {
  return e.options.scope?.id;
}
var Kn = class extends Re {
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
    this.options = this.#e.defaultMutationOptions(e), Ze(this.options, t) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), t?.mutationKey && this.options.mutationKey && xe(t.mutationKey) !== xe(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
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
    const e = this.#i?.state ?? Qi();
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
    H.batch(() => {
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
}, Qn = class extends Re {
  constructor(e = {}) {
    super(), this.config = e, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(e, t, i) {
    const n = t.queryKey, r = t.queryHash ?? At(n, t);
    let o = this.get(r);
    return o || (o = new zn({
      client: e,
      queryKey: n,
      queryHash: r,
      options: e.defaultQueryOptions(t),
      state: i,
      defaultOptions: e.getQueryDefaults(n)
    }), this.add(o)), o;
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
    H.batch(() => {
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
      (i) => Xt(t, i)
    );
  }
  findAll(e = {}) {
    const t = this.getAll();
    return Object.keys(e).length > 0 ? t.filter((i) => Xt(e, i)) : t;
  }
  notify(e) {
    H.batch(() => {
      this.listeners.forEach((t) => {
        t(e);
      });
    });
  }
  onFocus() {
    H.batch(() => {
      this.getAll().forEach((e) => {
        e.onFocus();
      });
    });
  }
  onOnline() {
    H.batch(() => {
      this.getAll().forEach((e) => {
        e.onOnline();
      });
    });
  }
}, jn = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  #s;
  constructor(e = {}) {
    this.#e = e.queryCache || new Qn(), this.#t = e.mutationCache || new Gn(), this.#i = e.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = zt.subscribe(async (e) => {
      e && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = et.subscribe(async (e) => {
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
    return n === void 0 ? this.fetchQuery(e) : (e.revalidateIfStale && i.isStaleByTime(fe(t.staleTime, i)) && this.prefetchQuery(t), Promise.resolve(n));
  }
  getQueriesData(e) {
    return this.#e.findAll(e).map(({ queryKey: t, state: i }) => {
      const n = i.data;
      return [t, n];
    });
  }
  setQueryData(e, t, i) {
    const n = this.defaultQueryOptions({ queryKey: e }), o = this.#e.get(
      n.queryHash
    )?.state.data, a = kn(t, o);
    if (a !== void 0)
      return this.#e.build(this, n).setData(a, { ...i, manual: !0 });
  }
  setQueriesData(e, t, i) {
    return H.batch(
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
    H.batch(() => {
      t.findAll(e).forEach((i) => {
        t.remove(i);
      });
    });
  }
  resetQueries(e, t) {
    const i = this.#e;
    return H.batch(() => (i.findAll(e).forEach((n) => {
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
    const i = { revert: !0, ...t }, n = H.batch(
      () => this.#e.findAll(e).map((r) => r.cancel(i))
    );
    return Promise.all(n).then(j).catch(j);
  }
  invalidateQueries(e, t = {}) {
    return H.batch(() => (this.#e.findAll(e).forEach((i) => {
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
    }, n = H.batch(
      () => this.#e.findAll(e).filter((r) => !r.isDisabled() && !r.isStatic()).map((r) => {
        let o = r.fetch(void 0, i);
        return i.throwOnError || (o = o.catch(j)), r.state.fetchStatus === "paused" ? Promise.resolve() : o;
      })
    );
    return Promise.all(n).then(j);
  }
  fetchQuery(e) {
    const t = this.defaultQueryOptions(e);
    t.retry === void 0 && (t.retry = !1);
    const i = this.#e.build(this, t);
    return i.isStaleByTime(
      fe(t.staleTime, i)
    ) ? i.fetch(t) : Promise.resolve(i.state.data);
  }
  prefetchQuery(e) {
    return this.fetchQuery(e).then(j).catch(j);
  }
  fetchInfiniteQuery(e) {
    return e.behavior = si(e.pages), this.fetchQuery(e);
  }
  prefetchInfiniteQuery(e) {
    return this.fetchInfiniteQuery(e).then(j).catch(j);
  }
  ensureInfiniteQueryData(e) {
    return e.behavior = si(e.pages), this.ensureQueryData(e);
  }
  resumePausedMutations() {
    return et.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
    this.#r.set(xe(e), {
      queryKey: e,
      defaultOptions: t
    });
  }
  getQueryDefaults(e) {
    const t = [...this.#r.values()], i = {};
    return t.forEach((n) => {
      Ue(e, n.queryKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  setMutationDefaults(e, t) {
    this.#n.set(xe(e), {
      mutationKey: e,
      defaultOptions: t
    });
  }
  getMutationDefaults(e) {
    const t = [...this.#n.values()], i = {};
    return t.forEach((n) => {
      Ue(e, n.mutationKey) && Object.assign(i, n.defaultOptions);
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
    return t.queryHash || (t.queryHash = At(
      t.queryKey,
      t
    )), t.refetchOnReconnect === void 0 && (t.refetchOnReconnect = t.networkMode !== "always"), t.throwOnError === void 0 && (t.throwOnError = !!t.suspense), !t.networkMode && t.persister && (t.networkMode = "offlineFirst"), t.queryFn === Lt && (t.enabled = !1), t;
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
}, Ee, U, ot, ai, tt = 0, ji = [], z = E, li = z.__b, ci = z.__r, di = z.diffed, ui = z.__c, hi = z.unmount, fi = z.__;
function He(e, t) {
  z.__h && z.__h(U, e, tt || t), tt = 0;
  var i = U.__H || (U.__H = { __: [], __h: [] });
  return e >= i.__.length && i.__.push({}), i.__[e];
}
function x(e) {
  return tt = 1, qn(qi, e);
}
function qn(e, t, i) {
  var n = He(Ee++, 2);
  if (n.t = e, !n.__c && (n.__ = [i ? i(t) : qi(void 0, t), function(l) {
    var u = n.__N ? n.__N[0] : n.__[0], c = n.t(u, l);
    u !== c && (n.__N = [c, n.__[1]], n.__c.setState({}));
  }], n.__c = U, !U.__f)) {
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
    U.__f = !0;
    var o = U.shouldComponentUpdate, a = U.componentWillUpdate;
    U.componentWillUpdate = function(l, u, c) {
      if (this.__e) {
        var h = o;
        o = void 0, r(l, u, c), o = h;
      }
      a && a.call(this, l, u, c);
    }, U.shouldComponentUpdate = r;
  }
  return n.__N || n.__;
}
function K(e, t) {
  var i = He(Ee++, 3);
  !z.__s && $t(i.__H, t) && (i.__ = e, i.u = t, U.__H.__h.push(i));
}
function Vn(e, t) {
  var i = He(Ee++, 4);
  !z.__s && $t(i.__H, t) && (i.__ = e, i.u = t, U.__h.push(i));
}
function wt(e, t) {
  var i = He(Ee++, 7);
  return $t(i.__H, t) && (i.__ = e(), i.__H = t, i.__h = e), i.__;
}
function te(e, t) {
  return tt = 8, wt(function() {
    return e;
  }, t);
}
function Bt(e) {
  var t = U.context[e.__c], i = He(Ee++, 9);
  return i.c = e, t ? (i.__ == null && (i.__ = !0, t.sub(U)), t.props.value) : e.__;
}
function Yn() {
  for (var e; e = ji.shift(); ) if (e.__P && e.__H) try {
    e.__H.__h.forEach(Ye), e.__H.__h.forEach(St), e.__H.__h = [];
  } catch (t) {
    e.__H.__h = [], z.__e(t, e.__v);
  }
}
z.__b = function(e) {
  U = null, li && li(e);
}, z.__ = function(e, t) {
  e && t.__k && t.__k.__m && (e.__m = t.__k.__m), fi && fi(e, t);
}, z.__r = function(e) {
  ci && ci(e), Ee = 0;
  var t = (U = e.__c).__H;
  t && (ot === U ? (t.__h = [], U.__h = [], t.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (t.__h.forEach(Ye), t.__h.forEach(St), t.__h = [], Ee = 0)), ot = U;
}, z.diffed = function(e) {
  di && di(e);
  var t = e.__c;
  t && t.__H && (t.__H.__h.length && (ji.push(t) !== 1 && ai === z.requestAnimationFrame || ((ai = z.requestAnimationFrame) || Xn)(Yn)), t.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), ot = U = null;
}, z.__c = function(e, t) {
  t.some(function(i) {
    try {
      i.__h.forEach(Ye), i.__h = i.__h.filter(function(n) {
        return !n.__ || St(n);
      });
    } catch (n) {
      t.some(function(r) {
        r.__h && (r.__h = []);
      }), t = [], z.__e(n, i.__v);
    }
  }), ui && ui(e, t);
}, z.unmount = function(e) {
  hi && hi(e);
  var t, i = e.__c;
  i && i.__H && (i.__H.__.forEach(function(n) {
    try {
      Ye(n);
    } catch (r) {
      t = r;
    }
  }), i.__H = void 0, t && z.__e(t, i.__v));
};
var pi = typeof requestAnimationFrame == "function";
function Xn(e) {
  var t, i = function() {
    clearTimeout(n), pi && cancelAnimationFrame(t), setTimeout(e);
  }, n = setTimeout(i, 35);
  pi && (t = requestAnimationFrame(i));
}
function Ye(e) {
  var t = U, i = e.__c;
  typeof i == "function" && (e.__c = void 0, i()), U = t;
}
function St(e) {
  var t = U;
  e.__c = e.__(), U = t;
}
function $t(e, t) {
  return !e || e.length !== t.length || t.some(function(i, n) {
    return i !== e[n];
  });
}
function qi(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function Jn(e, t) {
  for (var i in t) e[i] = t[i];
  return e;
}
function mi(e, t) {
  for (var i in e) if (i !== "__source" && !(i in t)) return !0;
  for (var n in t) if (n !== "__source" && e[n] !== t[n]) return !0;
  return !1;
}
function Vi(e, t) {
  var i = t(), n = x({ t: { __: i, u: t } }), r = n[0].t, o = n[1];
  return Vn(function() {
    r.__ = i, r.u = t, at(r) && o({ t: r });
  }, [e, i, t]), K(function() {
    return at(r) && o({ t: r }), e(function() {
      at(r) && o({ t: r });
    });
  }, [e]), i;
}
function at(e) {
  var t, i, n = e.u, r = e.__;
  try {
    var o = n();
    return !((t = r) === (i = o) && (t !== 0 || 1 / t == 1 / i) || t != t && i != i);
  } catch {
    return !0;
  }
}
function gi(e, t) {
  this.props = e, this.context = t;
}
(gi.prototype = new ae()).isPureReactComponent = !0, gi.prototype.shouldComponentUpdate = function(e, t) {
  return mi(this.props, e) || mi(this.state, t);
};
var yi = E.__b;
E.__b = function(e) {
  e.type && e.type.__f && e.ref && (e.props.ref = e.ref, e.ref = null), yi && yi(e);
};
var Zn = E.__e;
E.__e = function(e, t, i, n) {
  if (e.then) {
    for (var r, o = t; o = o.__; ) if ((r = o.__c) && r.__c) return t.__e == null && (t.__e = i.__e, t.__k = i.__k), r.__c(e, t);
  }
  Zn(e, t, i, n);
};
var _i = E.unmount;
function Yi(e, t, i) {
  return e && (e.__c && e.__c.__H && (e.__c.__H.__.forEach(function(n) {
    typeof n.__c == "function" && n.__c();
  }), e.__c.__H = null), (e = Jn({}, e)).__c != null && (e.__c.__P === i && (e.__c.__P = t), e.__c.__e = !0, e.__c = null), e.__k = e.__k && e.__k.map(function(n) {
    return Yi(n, t, i);
  })), e;
}
function Xi(e, t, i) {
  return e && i && (e.__v = null, e.__k = e.__k && e.__k.map(function(n) {
    return Xi(n, t, i);
  }), e.__c && e.__c.__P === t && (e.__e && i.appendChild(e.__e), e.__c.__e = !0, e.__c.__P = i)), e;
}
function lt() {
  this.__u = 0, this.o = null, this.__b = null;
}
function Ji(e) {
  if (!e.__) return null;
  var t = e.__.__c;
  return t && t.__a && t.__a(e);
}
function Ge() {
  this.i = null, this.l = null;
}
E.unmount = function(e) {
  var t = e.__c;
  t && (t.__z = !0), t && t.__R && t.__R(), t && 32 & e.__u && (e.type = null), _i && _i(e);
}, (lt.prototype = new ae()).__c = function(e, t) {
  var i = t.__c, n = this;
  n.o == null && (n.o = []), n.o.push(i);
  var r = Ji(n.__v), o = !1, a = function() {
    o || n.__z || (o = !0, i.__R = null, r ? r(u) : u());
  };
  i.__R = a;
  var l = i.__P;
  i.__P = null;
  var u = function() {
    if (!--n.__u) {
      if (n.state.__a) {
        var c = n.state.__a;
        n.__v.__k[0] = Xi(c, c.__c.__P, c.__c.__O);
      }
      var h;
      for (n.setState({ __a: n.__b = null }); h = n.o.pop(); ) h.__P = l, h.forceUpdate();
    }
  };
  n.__u++ || 32 & t.__u || n.setState({ __a: n.__b = n.__v.__k[0] }), e.then(a, a);
}, lt.prototype.componentWillUnmount = function() {
  this.o = [];
}, lt.prototype.render = function(e, t) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), n = this.__v.__k[0].__c;
      this.__v.__k[0] = Yi(this.__b, i, n.__O = n.__P);
    }
    this.__b = null;
  }
  var r = t.__a && ht(q, null, e.fallback);
  return r && (r.__u &= -33), [ht(q, null, t.__a ? null : e.children), r];
};
var vi = function(e, t, i) {
  if (++i[1] === i[0] && e.l.delete(t), e.props.revealOrder && (e.props.revealOrder[0] !== "t" || !e.l.size)) for (i = e.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    e.i = i = i[2];
  }
};
(Ge.prototype = new ae()).__a = function(e) {
  var t = this, i = Ji(t.__v), n = t.l.get(e);
  return n[0]++, function(r) {
    var o = function() {
      t.props.revealOrder ? (n.push(r), vi(t, e, n)) : r();
    };
    i ? i(o) : o();
  };
}, Ge.prototype.render = function(e) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var t = Je(e.children);
  e.revealOrder && e.revealOrder[0] === "b" && t.reverse();
  for (var i = t.length; i--; ) this.l.set(t[i], this.i = [1, 0, this.i]);
  return e.children;
}, Ge.prototype.componentDidUpdate = Ge.prototype.componentDidMount = function() {
  var e = this;
  this.l.forEach(function(t, i) {
    vi(e, i, t);
  });
};
var er = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, tr = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, ir = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, nr = /[A-Z0-9]/g, rr = typeof document < "u", sr = function(e) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(e);
};
ae.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(e) {
  Object.defineProperty(ae.prototype, e, { configurable: !0, get: function() {
    return this["UNSAFE_" + e];
  }, set: function(t) {
    Object.defineProperty(this, e, { configurable: !0, writable: !0, value: t });
  } });
});
var bi = E.event;
function or() {
}
function ar() {
  return this.cancelBubble;
}
function lr() {
  return this.defaultPrevented;
}
E.event = function(e) {
  return bi && (e = bi(e)), e.persist = or, e.isPropagationStopped = ar, e.isDefaultPrevented = lr, e.nativeEvent = e;
};
var cr = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, wi = E.vnode;
E.vnode = function(e) {
  typeof e.type == "string" && (function(t) {
    var i = t.props, n = t.type, r = {}, o = n.indexOf("-") === -1;
    for (var a in i) {
      var l = i[a];
      if (!(a === "value" && "defaultValue" in i && l == null || rr && a === "children" && n === "noscript" || a === "class" || a === "className")) {
        var u = a.toLowerCase();
        a === "defaultValue" && "value" in i && i.value == null ? a = "value" : a === "download" && l === !0 ? l = "" : u === "translate" && l === "no" ? l = !1 : u[0] === "o" && u[1] === "n" ? u === "ondoubleclick" ? a = "ondblclick" : u !== "onchange" || n !== "input" && n !== "textarea" || sr(i.type) ? u === "onfocus" ? a = "onfocusin" : u === "onblur" ? a = "onfocusout" : ir.test(a) && (a = u) : u = a = "oninput" : o && tr.test(a) ? a = a.replace(nr, "-$&").toLowerCase() : l === null && (l = void 0), u === "oninput" && r[a = u] && (a = "oninputCapture"), r[a] = l;
      }
    }
    n == "select" && r.multiple && Array.isArray(r.value) && (r.value = Je(i.children).forEach(function(c) {
      c.props.selected = r.value.indexOf(c.props.value) != -1;
    })), n == "select" && r.defaultValue != null && (r.value = Je(i.children).forEach(function(c) {
      c.props.selected = r.multiple ? r.defaultValue.indexOf(c.props.value) != -1 : r.defaultValue == c.props.value;
    })), i.class && !i.className ? (r.class = i.class, Object.defineProperty(r, "className", cr)) : (i.className && !i.class || i.class && i.className) && (r.class = r.className = i.className), t.props = r;
  })(e), e.$$typeof = er, wi && wi(e);
};
var Si = E.__r;
E.__r = function(e) {
  Si && Si(e), e.__c;
};
var xi = E.diffed;
E.diffed = function(e) {
  xi && xi(e);
  var t = e.props, i = e.__e;
  i != null && e.type === "textarea" && "value" in t && t.value !== i.value && (i.value = t.value == null ? "" : t.value);
};
var Zi = Mt(
  void 0
), Be = (e) => {
  const t = Bt(Zi);
  if (!t)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return t;
}, dr = ({
  client: e,
  children: t
}) => (K(() => (e.mount(), () => {
  e.unmount();
}), [e]), /* @__PURE__ */ s(Zi.Provider, { value: e, children: t })), en = Mt(!1), ur = () => Bt(en);
en.Provider;
function hr() {
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
var fr = Mt(hr()), pr = () => Bt(fr), mr = (e, t, i) => {
  const n = i?.state.error && typeof e.throwOnError == "function" ? Ut(e.throwOnError, [i.state.error, i]) : e.throwOnError;
  (e.suspense || e.experimental_prefetchInRender || n) && (t.isReset() || (e.retryOnMount = !1));
}, gr = (e) => {
  K(() => {
    e.clearReset();
  }, [e]);
}, yr = ({
  result: e,
  errorResetBoundary: t,
  throwOnError: i,
  query: n,
  suspense: r
}) => e.isError && !t.isReset() && !e.isFetching && n && (r && e.data === void 0 || Ut(i, [e.error, n])), _r = (e) => {
  if (e.suspense) {
    const i = (r) => r === "static" ? r : Math.max(r ?? 1e3, 1e3), n = e.staleTime;
    e.staleTime = typeof n == "function" ? (...r) => i(n(...r)) : i(n), typeof e.gcTime == "number" && (e.gcTime = Math.max(
      e.gcTime,
      1e3
    ));
  }
}, vr = (e, t) => e.isLoading && e.isFetching && !t, br = (e, t) => e?.suspense && t.isPending, Ei = (e, t, i) => t.fetchOptimistic(e).catch(() => {
  i.clearReset();
});
function wr(e, t, i) {
  const n = ur(), r = pr(), o = Be(), a = o.defaultQueryOptions(e);
  o.getDefaultOptions().queries?._experimental_beforeQuery?.(
    a
  );
  const l = o.getQueryCache().get(a.queryHash);
  a._optimisticResults = n ? "isRestoring" : "optimistic", _r(a), mr(a, r, l), gr(r);
  const u = !o.getQueryCache().get(a.queryHash), [c] = x(
    () => new t(
      o,
      a
    )
  ), h = c.getOptimisticResult(a), d = !n && e.subscribed !== !1;
  if (Vi(
    te(
      (p) => {
        const m = d ? c.subscribe(H.batchCalls(p)) : j;
        return c.updateResult(), m;
      },
      [c, d]
    ),
    () => c.getCurrentResult()
  ), K(() => {
    c.setOptions(a);
  }, [a, c]), br(a, h))
    throw Ei(a, c, r);
  if (yr({
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
  ), a.experimental_prefetchInRender && !Se && vr(h, n) && (u ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    Ei(a, c, r)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    l?.promise
  ))?.catch(j).finally(() => {
    c.updateResult();
  }), a.notifyOnChangeProps ? h : c.trackResult(h);
}
function nt(e, t) {
  return wr(e, Hn);
}
function Ce(e, t) {
  const i = Be(), [n] = x(
    () => new Kn(
      i,
      e
    )
  );
  K(() => {
    n.setOptions(e);
  }, [n, e]);
  const r = Vi(
    te(
      (a) => n.subscribe(H.batchCalls(a)),
      [n]
    ),
    () => n.getCurrentResult()
  ), o = te(
    (a, l) => {
      n.mutate(a, l).catch(j);
    },
    [n]
  );
  if (r.error && Ut(n.options.throwOnError, [r.error]))
    throw r.error;
  return { ...r, mutate: o, mutateAsync: r.mutate };
}
const re = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif", f = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "100%",
    minHeight: "100%",
    fontFamily: re
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
    fontFamily: re
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
    fontFamily: re
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
    fontFamily: re
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: re
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
    fontFamily: re,
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
    fontFamily: re
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
    fontFamily: re
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
}, Sr = `
* { font-family: ${re}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function k({
  variant: e,
  children: t,
  onClick: i,
  type: n = "button",
  title: r,
  active: o = !1,
  style: a,
  class: l,
  disabled: u,
  "aria-label": c
}) {
  const h = e === "primary" ? f.primaryBtn : e === "secondary" ? f.secondaryBtn : e === "icon" ? f.iconBtn : e === "iconSm" ? f.iconBtnSm : e === "placement" ? f.placementBtn(o) : {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.25rem",
    fontFamily: re
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
      children: t
    }
  );
}
const xr = "https://devgw.revgain.ai/rg-pex", Nt = "designerIud";
function Er() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(Nt);
  } catch {
    return null;
  }
}
function Ke(e) {
  const t = {
    "Content-Type": "application/json",
    schema: "customer_1001",
    ...e
  }, i = Er();
  return i && (t.iud = i), t;
}
const J = {
  baseUrl: xr,
  async get(e, t) {
    const i = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, n = await fetch(i, {
      ...t,
      headers: { ...Ke(), ...t?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  },
  async post(e, t, i) {
    const n = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, r = await fetch(n, {
      method: "POST",
      ...i,
      headers: { ...Ke(), ...i?.headers },
      body: t !== void 0 ? JSON.stringify(t) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async put(e, t, i) {
    const n = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, r = await fetch(n, {
      method: "PUT",
      ...i,
      headers: { ...Ke(), ...i?.headers },
      body: t !== void 0 ? JSON.stringify(t) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async delete(e, t) {
    const i = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, n = await fetch(i, {
      method: "DELETE",
      ...t,
      headers: { ...Ke(), ...t?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  }
}, Cr = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  IUD_STORAGE_KEY: Nt,
  apiClient: J
}, Symbol.toStringTag, { value: "Module" })), tn = (e) => ["guides", "byId", e];
async function Tr(e) {
  const t = new URLSearchParams({ guide_id: e });
  return J.get(`/guides?${t.toString()}`);
}
function kr(e) {
  return nt({
    queryKey: tn(e),
    queryFn: () => Tr(e),
    enabled: !!e,
    retry: 0
  });
}
const Ir = ["guides", "update"];
async function Pr({
  guideId: e,
  payload: t
}) {
  return J.put(`/guides/${e}`, t);
}
function Rr() {
  const e = Be();
  return Ce({
    mutationKey: Ir,
    mutationFn: Pr,
    onSuccess: (t, i) => {
      e.invalidateQueries({ queryKey: tn(i.guideId) });
    }
  });
}
const xt = "Template", Et = "Description", Ct = "Next";
function Or(e) {
  try {
    const t = JSON.parse(e || "{}");
    return {
      title: t.title ?? xt,
      description: t.description ?? Et,
      buttonContent: t.buttonContent ?? Ct
    };
  } catch {
    return {
      title: xt,
      description: Et,
      buttonContent: Ct
    };
  }
}
function Fr(e) {
  return e?.template_key ?? "";
}
const nn = {
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
function rn({
  title: e = xt,
  description: t = Et,
  buttonContent: i = Ct
}) {
  return /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: 4, position: "relative" }, children: [
    /* @__PURE__ */ s("h3", { style: { fontSize: 14, fontWeight: 600, color: "#1855BC", lineHeight: 1.3, margin: 0 }, children: e }),
    /* @__PURE__ */ s("p", { style: { fontSize: 11, color: "#6b7280", lineHeight: 1.4, margin: 0 }, children: t }),
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
function Dr(e) {
  return /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", margin: "0 auto" }, children: /* @__PURE__ */ s("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 8, ...nn }, children: [
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
    /* @__PURE__ */ s(rn, { ...e })
  ] }) });
}
function Mr(e) {
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
    /* @__PURE__ */ s("div", { style: { position: "relative", marginTop: 0, display: "flex", flexDirection: "column", gap: 8, ...nn }, children: [
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
      /* @__PURE__ */ s(rn, { ...e })
    ] })
  ] });
}
function Ar({
  item: e,
  selected: t = !1,
  onClick: i,
  disabled: n = !1
}) {
  const r = e.template, o = wt(() => Fr(r), [r]), a = wt(() => Or(r.content), [r.content]);
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
        border: t ? "2px solid #3b82f6" : "1px solid #e2e8f0",
        borderRadius: 12,
        background: t ? "rgba(59, 130, 246, 0.06)" : "#fff",
        cursor: n ? "not-allowed" : "pointer",
        opacity: n ? 0.7 : 1,
        textAlign: "left",
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ s(
          o === "tooltip-scratch" ? Mr : Dr,
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
function Lr({
  onMessage: e,
  elementSelected: t,
  guideId: i = null,
  templateId: n = null
}) {
  const [r, o] = x(""), [a, l] = x(void 0), [u, c] = x(null), [h, d] = x(""), [p, m] = x("right"), [_, y] = x(""), [S, b] = x(n ?? null), [v, M] = x(!1), [L, B] = x("on_click"), [F, A] = x(null), [C, R] = x(!1), { data: N, isLoading: D } = kr(i), w = N?.data, $ = w?.templates ?? [], V = Rr(), Q = S ? $.find((P) => P.template_id === S) : null;
  K(() => {
    w && n && $.some((P) => P.template_id === n) && b(n);
  }, [w, n, $]), K(() => {
    e({ type: "EDITOR_READY" });
  }, []), K(() => {
    t ? v ? A({
      selector: t.selector,
      xpath: t.xpath,
      elementInfo: t.elementInfo
    }) : (o(t.selector), l(t.xpath), c(t.elementInfo), d(""), y("")) : v && A(null);
  }, [t, v]);
  const me = () => {
    R(!1), o(""), l(void 0), c(null), d(""), y(""), e({ type: "CLEAR_SELECTION_CLICKED" });
  }, le = async () => {
    if (!w || !i) return;
    const P = Ae(), W = a ?? (r && (r.startsWith("/") || r.startsWith("//")) ? r : null), ye = (w.steps ?? w.templates ?? []).slice().sort((O, Z) => O.step_order - Z.step_order).map((O) => ({
      template_id: O.template_id,
      step_order: O.step_order,
      url: O.template_id === S ? P : O.url ?? P,
      x_path: O.template_id === S ? W : O.x_path
    })), ne = {
      guide_name: w.guide_name ?? "",
      description: w.description ?? "",
      target_segment: w.target_segment ?? null,
      guide_category: w.guide_category ?? null,
      target_page: w.target_page ?? P,
      type: w.type ?? "modal",
      status: w.status ?? "draft",
      priority: w.priority ?? 0,
      templates: ye
    };
    y("");
    try {
      await V.mutateAsync({ guideId: i, payload: ne }), me();
    } catch (O) {
      const Z = O instanceof Error ? O.message : "Failed to update guide";
      y(Z);
    }
  }, ge = async () => {
    if (!w || !i) return;
    const P = Ae(), W = F?.xpath ?? (F?.selector?.startsWith("/") || F?.selector?.startsWith("//") ? F?.selector : null) ?? null, ye = (w.steps ?? w.templates ?? []).slice().sort((O, Z) => O.step_order - Z.step_order).map((O) => ({
      template_id: O.template_id,
      step_order: O.step_order,
      url: O.url ?? P,
      x_path: O.x_path
    })), ne = {
      guide_name: w.guide_name ?? "",
      description: w.description ?? "",
      target_segment: W,
      guide_category: w.guide_category ?? null,
      target_page: P,
      type: w.type ?? "modal",
      status: w.status ?? "draft",
      priority: w.priority ?? 0,
      templates: ye
    };
    y("");
    try {
      await V.mutateAsync({ guideId: i, payload: ne }), me();
    } catch (O) {
      const Z = O instanceof Error ? O.message : "Failed to update guide";
      y(Z);
    }
  }, ie = (P) => {
    const W = [];
    return P.tagName && W.push(`Tag: ${P.tagName}`), P.id && W.push(`ID: ${P.id}`), P.className && W.push(`Class: ${P.className}`), P.textContent && W.push(`Text: ${P.textContent}`), W.join(" | ");
  }, X = !!i && !!w;
  return /* @__PURE__ */ s("div", { style: f.root, children: [
    /* @__PURE__ */ s("div", { style: f.header, children: [
      /* @__PURE__ */ s("h2", { style: f.headerTitle, children: X ? w?.guide_name ?? "Guide" : "Create Guide" }),
      /* @__PURE__ */ s(k, { variant: "icon", onClick: () => e({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    v ? /* @__PURE__ */ s("div", { style: { ...f.section, paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ s(
        k,
        {
          variant: "secondary",
          style: { alignSelf: "flex-start" },
          onClick: () => {
            R(!1), M(!1), A(null), e({ type: "CLEAR_SELECTION_CLICKED" });
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
            value: L,
            onChange: (P) => B(P.target.value),
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
        F ? /* @__PURE__ */ s(q, { children: [
          /* @__PURE__ */ s("div", { style: { ...f.selectorBox, marginTop: "0.5rem" }, title: F.xpath ?? F.selector, children: (F.xpath ?? F.selector) || "-" }),
          F.elementInfo && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: [
            /* @__PURE__ */ s("strong", { style: f.elementInfoTitle, children: "Element Info" }),
            /* @__PURE__ */ s("div", { style: f.elementInfoText, children: ie(F.elementInfo) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              k,
              {
                variant: C ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  R(!0), e({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              k,
              {
                variant: "secondary",
                style: C ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  R(!1), e({ type: "CLEAR_SELECTION_CLICKED" });
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
                  R(!1), A(null), e({ type: "CLEAR_SELECTION_CLICKED" });
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
            variant: C ? "primary" : "secondary",
            style: { marginTop: "0.5rem" },
            onClick: () => {
              R(!0), e({ type: "ACTIVATE_SELECTOR" });
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
          onClick: ge,
          disabled: V.isPending,
          children: V.isPending ? "Updating…" : "Update Action"
        }
      ) }),
      _ && /* @__PURE__ */ s("div", { style: f.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        _
      ] })
    ] }) : /* @__PURE__ */ s(q, { children: i && D ? /* @__PURE__ */ s("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "2rem", color: "#3b82f6" } }),
      /* @__PURE__ */ s("p", { style: f.emptyStateText, children: "Loading guide…" })
    ] }) : i && !w ? /* @__PURE__ */ s("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle", style: { fontSize: "2rem", color: "#94a3b8" } }),
      /* @__PURE__ */ s("p", { style: f.emptyStateText, children: "Guide not found." })
    ] }) : X && $.length > 0 ? /* @__PURE__ */ s(q, { children: [
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
            children: $.sort((P, W) => P.step_order - W.step_order).map((P) => /* @__PURE__ */ s(
              Ar,
              {
                item: P,
                selected: S === P.template_id,
                onClick: () => b(P.template_id)
              },
              `${P.template_id}-${P.step_order}`
            ))
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Element for selected template" }),
        r ? /* @__PURE__ */ s(q, { children: [
          /* @__PURE__ */ s("div", { style: f.selectorBox, title: a ?? r, children: (a ?? r).length > 60 ? (a ?? r).slice(0, 60) + "…" : a ?? r }),
          u && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: [
            /* @__PURE__ */ s("strong", { style: f.elementInfoTitle, children: "Element Info" }),
            /* @__PURE__ */ s("div", { style: f.elementInfoText, children: ie(u) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              k,
              {
                variant: C ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  R(!0), e({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              k,
              {
                variant: "secondary",
                style: C ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  R(!1), e({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Hide Selector"
              }
            ),
            Q?.x_path && /* @__PURE__ */ s(
              k,
              {
                variant: "secondary",
                style: { flex: 1, borderColor: "#ef4444", color: "#dc2626" },
                onClick: me,
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
              onClick: le,
              disabled: V.isPending,
              children: V.isPending ? "Updating…" : "Update"
            }
          ) })
        ] }) : Q?.x_path ? /* @__PURE__ */ s(q, { children: [
          /* @__PURE__ */ s("div", { style: f.selectorBox, title: Q.x_path, children: Q.x_path.length > 60 ? Q.x_path.slice(0, 60) + "…" : Q.x_path }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              k,
              {
                variant: C ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  R(!0), e({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              k,
              {
                variant: "secondary",
                style: C ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  R(!1), e({ type: "CLEAR_SELECTION_CLICKED" });
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
              onClick: le,
              disabled: V.isPending,
              children: V.isPending ? "Updating…" : "Update"
            }
          ) })
        ] }) : /* @__PURE__ */ s(
          k,
          {
            variant: C ? "primary" : "secondary",
            onClick: () => {
              R(!0), e({ type: "ACTIVATE_SELECTOR" });
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:selection-marker" }),
              "Select element"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ s(k, { variant: "primary", onClick: () => M(!0), children: "Next" }) }),
      X && _ && /* @__PURE__ */ s("div", { style: f.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        _
      ] })
    ] }) : null })
  ] });
}
function De({
  type: e = "text",
  value: t,
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
function sn({
  value: e,
  onInput: t,
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
const Ur = ["pages", "create"];
async function zr(e) {
  return J.post("/pages", {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: "active"
  });
}
function Hr() {
  return Ce({
    mutationKey: Ur,
    mutationFn: zr
  });
}
const Br = ["pages", "update"];
async function $r({ pageId: e, payload: t }) {
  return J.put(`/pages/${e}`, {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: t.status ?? "active"
  });
}
function Nr() {
  return Ce({
    mutationKey: Br,
    mutationFn: $r
  });
}
const Wr = ["pages", "delete"];
async function Gr(e) {
  return J.delete(`/pages/${e}`);
}
function Kr() {
  return Ce({
    mutationKey: Wr,
    mutationFn: Gr
  });
}
const Qr = (e) => ["pages", "check-slug", e];
async function jr(e) {
  return J.get(`/pages/check-slug?slug=${encodeURIComponent(e)}`);
}
function qr(e) {
  return nt({
    queryKey: Qr(e),
    queryFn: () => jr(e),
    enabled: !!e,
    retry: 0
  });
}
const Vr = ["pages", "list"];
async function Yr() {
  return J.get("/pages");
}
function Xr() {
  return nt({
    queryKey: Vr,
    queryFn: Yr,
    retry: 0
  });
}
const Jr = "designerTaggedPages", Qe = ["pages", "check-slug"], ct = ["pages", "list"];
function je() {
  try {
    const t = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (t.host || t.hostname || "") + (t.pathname || "/") + (t.search || "") + (t.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function qe() {
  try {
    const t = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (t.pathname || "/").replace(/^\//, ""), n = t.search || "", r = t.hash || "";
    return "//*/" + i + n + r;
  } catch {
    return "//*/";
  }
}
function Zr({ onMessage: e }) {
  const [t, i] = x("overviewUntagged"), [n, r] = x(""), [o, a] = x(""), [l, u] = x(""), [c, h] = x(!1), [d, p] = x("create"), [m, _] = x(""), [y, S] = x(""), [b, v] = x("suggested"), [M, L] = x(""), [B, F] = x(!1), [A, C] = x(null), [R, N] = x(!1), D = Be(), w = Hr(), $ = Nr(), V = Kr(), { data: Q, isLoading: me, isError: le } = qr(n), { data: ge, isLoading: ie } = Xr(), X = !!n && me, P = w.isPending || $.isPending, W = (n || "").trim().toLowerCase(), ne = (ge?.data ?? []).filter((T) => (T.slug || "").trim().toLowerCase() === W).filter(
    (T) => (T.name || "").toLowerCase().includes(l.toLowerCase().trim())
  ), O = te(() => {
    i("overviewUntagged"), a(je() || "(current page)"), h(!1), D.invalidateQueries({ queryKey: Qe });
  }, [D]), Z = te(() => {
    i("taggedPagesDetailView"), u("");
  }, []), Te = te(() => {
    C(null), i("tagPageFormView"), h(!0), L(qe()), _(""), S(""), p("create"), v("suggested"), F(!1);
  }, []), rt = te((T) => {
    C(T.page_id), i("tagPageFormView"), h(!0), L(T.slug || qe()), _(T.name || ""), S(T.description || ""), p("create"), v("suggested"), F(!1);
  }, []);
  K(() => {
    e({ type: "EDITOR_READY" });
  }, []), K(() => {
    r(qe()), a(je() || "(current page)");
  }, []), K(() => {
    if (!n) {
      i("overviewUntagged");
      return;
    }
    if (le) {
      (t === "overviewTagged" || t === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    Q !== void 0 && (t === "overviewTagged" || t === "overviewUntagged") && i(Q.exists ? "overviewTagged" : "overviewUntagged");
  }, [n, Q, le, t]), K(() => {
    let T = je();
    const ce = () => {
      const ue = je();
      ue !== T && (T = ue, r(qe()), a(ue || "(current page)"), i("overviewUntagged"));
    }, de = () => ce(), ke = () => ce();
    window.addEventListener("hashchange", de), window.addEventListener("popstate", ke);
    const Oe = setInterval(ce, 1500);
    return () => {
      window.removeEventListener("hashchange", de), window.removeEventListener("popstate", ke), clearInterval(Oe);
    };
  }, []);
  const $e = async () => {
    const T = m.trim();
    if (!T) {
      F(!0);
      return;
    }
    F(!1);
    const ce = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, de = M.trim() || ce || "/";
    try {
      if (A)
        await $.mutateAsync({
          pageId: A,
          payload: {
            name: T,
            slug: de,
            description: y.trim() || void 0,
            status: "active"
          }
        }), C(null), D.invalidateQueries({ queryKey: Qe }), D.invalidateQueries({ queryKey: ct }), O();
      else {
        const ke = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, Oe = M.trim() || ke;
        await w.mutateAsync({
          name: T,
          slug: de,
          description: y.trim() || void 0
        });
        const ue = Jr, st = localStorage.getItem(ue) || "[]", g = JSON.parse(st);
        g.push({ pageName: T, url: Oe }), localStorage.setItem(ue, JSON.stringify(g)), D.invalidateQueries({ queryKey: Qe }), D.invalidateQueries({ queryKey: ct }), i("overviewTagged"), h(!1);
      }
    } catch {
    }
  }, se = async (T) => {
    if (window.confirm("Delete this page?"))
      try {
        await V.mutateAsync(T), D.invalidateQueries({ queryKey: Qe }), D.invalidateQueries({ queryKey: ct });
      } catch {
      }
  }, _e = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return R ? /* @__PURE__ */ s("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(k, { variant: "icon", title: "Expand", onClick: () => N(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: f.panel, children: [
    /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(k, { variant: "icon", title: "Minimize", onClick: () => N(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: f.panelBody, children: [
      X && (t === "overviewTagged" || t === "overviewUntagged") && /* @__PURE__ */ s("div", { style: { ..._e, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Checking page…" })
      ] }),
      !X && t === "overviewTagged" && /* @__PURE__ */ s("div", { style: _e, children: [
        /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "1rem", cursor: "pointer" }, onClick: Z, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ s("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: o })
            ] })
          ] }),
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ s(k, { variant: "primary", style: { width: "100%" }, onClick: Te, children: "Tag Page" })
      ] }),
      t === "taggedPagesDetailView" && /* @__PURE__ */ s("div", { style: _e, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (T) => {
              T.preventDefault(), O();
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: ie ? "…" : ne.length }),
          /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ s("div", { style: f.searchWrap, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
          /* @__PURE__ */ s(
            De,
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
        ie ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ s("span", { children: "Loading pages…" })
        ] }) : ne.map((T) => /* @__PURE__ */ s("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: T.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ s(k, { variant: "iconSm", title: "Edit", onClick: () => rt(T), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ s(k, { variant: "iconSm", title: "Delete", onClick: () => se(T.page_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, T.page_id)),
        /* @__PURE__ */ s(k, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: Te, children: "Tag Page" })
      ] }),
      !X && t === "overviewUntagged" && /* @__PURE__ */ s("div", { style: { ..._e, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ s("div", { style: { ...f.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ s(k, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: Te, children: "Tag Page" })
      ] }),
      t === "tagPageFormView" && /* @__PURE__ */ s("div", { style: { ..._e, gap: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (T) => {
              T.preventDefault(), C(null), O(), h(!1);
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back"
            ]
          }
        ),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: f.sectionLabel, children: A ? "EDIT PAGE" : "PAGE SETUP" }),
          !A && /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
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
                De,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: m,
                  onInput: (T) => _(T.target.value)
                }
              ),
              B && /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ s(
                sn,
                {
                  placeholder: "Click to add description",
                  value: y,
                  onInput: (T) => S(T.target.value),
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
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "suggested", checked: b === "suggested", onChange: () => v("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "exact", checked: b === "exact", onChange: () => v("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "builder", checked: b === "builder", onChange: () => v("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ s(De, { type: "text", placeholder: "e.g. //*/path/to/page", value: M, onInput: (T) => L(T.target.value) })
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
            C(null), O();
          },
          disabled: P,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ s(k, { variant: "primary", style: { flex: 1 }, onClick: $e, disabled: P, children: P ? /* @__PURE__ */ s(q, { children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        A ? "Updating…" : "Saving…"
      ] }) : A ? "Update" : "Save" })
    ] })
  ] });
}
const es = ["features", "create"];
async function ts(e) {
  return J.post("/features", e);
}
function is() {
  return Ce({
    mutationKey: es,
    mutationFn: ts
  });
}
const ns = ["features", "update"];
async function rs({
  featureId: e,
  payload: t
}) {
  return J.put(`/features/${e}`, t);
}
function ss() {
  return Ce({
    mutationKey: ns,
    mutationFn: rs
  });
}
const os = ["features", "delete"];
async function as(e) {
  return J.delete(`/features/${e}`);
}
function ls() {
  return Ce({
    mutationKey: os,
    mutationFn: as
  });
}
const Fe = ["features", "list"];
async function cs() {
  const e = await J.get("/features");
  return Array.isArray(e) ? { data: e } : e;
}
function ds() {
  return nt({
    queryKey: Fe,
    queryFn: cs,
    retry: 0
  });
}
const Ci = "designerHeatmapEnabled";
function us({ onMessage: e, elementSelected: t }) {
  const [i, n] = x("overview"), [r, o] = x(!1), [a, l] = x(""), [u, c] = x(null), [h, d] = x(""), [p, m] = x(!1), [_, y] = x(!1), [S, b] = x(!1), [v, M] = x(!1), [L, B] = x(!1), [F, A] = x("create"), [C, R] = x("suggested"), [N, D] = x(""), [w, $] = x(""), [V, Q] = x(null), [me, le] = x(null), [ge, ie] = x(""), X = Be(), P = is(), W = ss(), ye = ls(), { data: ne, isLoading: O } = ds(), Z = P.isPending || W.isPending || ye.isPending, Te = ne?.data ?? [], rt = Te.length, $e = Te.filter((g) => (g.name || "").toLowerCase().includes(ge.toLowerCase().trim())).sort((g, Y) => (g.name || "").localeCompare(Y.name || "", void 0, { sensitivity: "base" })), se = te(() => {
    n("overview"), o(!1), l(""), c(null), $(""), d(""), m(!1), Q(null), ie(""), X.invalidateQueries({ queryKey: Fe });
  }, [X]), _e = te(() => {
    n("taggedList"), ie("");
  }, []), T = te((g) => g.rules?.find(
    (he) => he.selector_type === "xpath" && (he.selector_value ?? "").trim() !== ""
  )?.selector_value ?? "", []), ce = te(
    (g) => {
      n("form"), o(!0), g ? (Q(g.feature_id), d(g.name || ""), D(g.description || ""), $(T(g)), R("exact")) : (Q(null), d(""), D(""), $(t?.xpath || ""), l(t?.selector || ""), c(t?.elementInfo || null)), m(!1);
    },
    [t, T]
  );
  K(() => {
    e({ type: "EDITOR_READY" });
  }, []), K(() => {
    e({ type: "FEATURES_FOR_HEATMAP", features: ne?.data ?? [] });
  }, [ne, e]), K(() => {
    const g = localStorage.getItem(Ci) === "true";
    y(g);
  }, []), K(() => {
    t ? (l(t.selector), c(t.elementInfo), $(t.xpath || ""), o(!0), n("form"), d(""), m(!1), A("create"), D(""), R("exact")) : se();
  }, [t]);
  const de = () => {
    const g = !_;
    y(g);
    try {
      localStorage.setItem(Ci, String(g));
    } catch {
    }
    e({ type: "HEATMAP_TOGGLE", enabled: g });
  }, ke = (g) => g.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""), Oe = async () => {
    const g = h.trim();
    if (!g) {
      m(!0);
      return;
    }
    m(!1);
    const Y = w || t?.xpath || "";
    if (C === "exact") {
      if (!Y) return;
      const he = {
        name: g,
        slug: ke(g),
        description: N.trim() || "",
        status: "active",
        rules: [
          {
            selector_type: "xpath",
            selector_value: Y,
            match_mode: "exact",
            priority: 10,
            is_active: !0
          }
        ]
      };
      try {
        V ? (await W.mutateAsync({ featureId: V, payload: he }), X.invalidateQueries({ queryKey: Fe }), se()) : (await P.mutateAsync(he), X.invalidateQueries({ queryKey: Fe }), se());
      } catch {
      }
      return;
    }
  }, ue = async (g) => {
    if (window.confirm("Delete this feature?")) {
      le(g);
      try {
        await ye.mutateAsync(g), X.invalidateQueries({ queryKey: Fe }), V === g && (Q(null), se());
      } catch {
      } finally {
        le(null);
      }
    }
  }, st = (g) => {
    const Y = [];
    g.tagName && Y.push(`Tag: ${g.tagName}`), g.id && Y.push(`ID: ${g.id}`), g.className && Y.push(`Class: ${g.className}`);
    const he = (g.textContent || "").slice(0, 80);
    return he && Y.push(`Text: ${he}`), Y.join(" | ");
  };
  return S ? /* @__PURE__ */ s("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: r ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(k, { variant: "icon", title: "Expand", onClick: () => b(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: f.panel, children: [
    /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(k, { variant: "icon", title: "Minimize", onClick: () => b(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: r ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ s("a", { href: "#", style: f.link, onClick: (g) => {
          g.preventDefault(), se();
        }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: F === "create", onChange: () => A("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: F === "merge", onChange: () => A("merge"), style: { accentColor: "#3b82f6" } }),
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
                De,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: h,
                  onInput: (g) => d(g.target.value)
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
                sn,
                {
                  placeholder: "Describe your Feature",
                  value: N,
                  onInput: (g) => D(g.target.value),
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
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: C === "suggested", onChange: () => R("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: C === "ruleBuilder", onChange: () => R("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: C === "customCss", onChange: () => R("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: C === "exact", onChange: () => R("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: C === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ s("div", { style: f.selectorBox, children: C === "exact" ? (t?.xpath ?? w) || "-" : (t?.selector ?? a) || "-" })
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
                onClick: () => B((g) => !g),
                "aria-expanded": L,
                children: [
                  /* @__PURE__ */ s("label", { style: { ...f.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                  /* @__PURE__ */ s(
                    "iconify-icon",
                    {
                      icon: L ? "mdi:chevron-up" : "mdi:chevron-down",
                      style: { fontSize: "1.125rem", color: "#64748b", flexShrink: 0 }
                    }
                  )
                ]
              }
            ),
            L && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.elementInfoText, children: st(u) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ s("div", { style: f.footer, children: [
        /* @__PURE__ */ s(k, { variant: "secondary", onClick: se, children: "Cancel" }),
        /* @__PURE__ */ s(k, { variant: "primary", style: { flex: 1 }, onClick: Oe, disabled: Z, children: Z ? "Saving..." : "Save" })
      ] })
    ] }) : /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i === "taggedList" ? /* @__PURE__ */ s(q, { children: [
      /* @__PURE__ */ s(
        "a",
        {
          href: "#",
          style: f.link,
          onClick: (g) => {
            g.preventDefault(), se();
          },
          children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
            " Back to overview"
          ]
        }
      ),
      /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: O ? "…" : $e.length }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Tagged Features" })
      ] }),
      /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged features" }),
      /* @__PURE__ */ s("div", { style: f.searchWrap, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
        /* @__PURE__ */ s(
          De,
          {
            type: "text",
            placeholder: "Search features",
            value: ge,
            onInput: (g) => ie(g.target.value),
            style: f.searchInput
          }
        ),
        ge && /* @__PURE__ */ s(k, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => ie(""), children: "Clear" })
      ] }),
      O ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Loading features…" })
      ] }) : $e.map((g) => {
        const Y = me === g.feature_id;
        return /* @__PURE__ */ s("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: g.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem", alignItems: "center" }, children: [
            /* @__PURE__ */ s(k, { variant: "iconSm", title: "Edit", onClick: () => ce(g), disabled: Y, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            Y ? /* @__PURE__ */ s("span", { style: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", color: "#64748b" } }) }) : /* @__PURE__ */ s(k, { variant: "iconSm", title: "Delete", onClick: () => ue(g.feature_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, g.feature_id);
      }),
      /* @__PURE__ */ s(k, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: () => ce(), children: "Tag Feature" })
    ] }) : O ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.75rem" } }),
      /* @__PURE__ */ s("span", { children: "Loading features…" })
    ] }) : /* @__PURE__ */ s(q, { children: [
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
      /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "0.75rem", cursor: "pointer" }, onClick: _e, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: rt }),
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
              style: f.toggle(_),
              onClick: de,
              onKeyDown: (g) => g.key === "Enter" && de(),
              children: /* @__PURE__ */ s("span", { style: f.toggleThumb(_) })
            }
          ),
          /* @__PURE__ */ s(k, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          k,
          {
            variant: v ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              M(!0), e({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Re-Select"
          }
        ),
        /* @__PURE__ */ s(
          k,
          {
            variant: "secondary",
            style: v ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              M(!1), e({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Hide Selector"
          }
        )
      ] })
    ] }) }) })
  ] });
}
const hs = new jn({
  defaultOptions: { mutations: { retry: 0 } }
});
class fs {
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
  create(t, i, n) {
    if (console.log("[Visual Designer] EditorFrame.create() called with mode:", i), this.iframe) {
      console.warn("[Visual Designer] EditorFrame already created, skipping");
      return;
    }
    this.mode = i || null, this.guideId = n?.guideId ?? null, this.templateId = n?.templateId ?? null, this.messageCallback = t, console.log("[Visual Designer] Creating editor iframe with mode:", this.mode), this.iframe = document.createElement("iframe"), this.iframe.id = "designer-editor-frame", this.iframe.style.cssText = `
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
    const n = (o) => this.messageCallback?.(o), r = this.mode === "tag-page" ? /* @__PURE__ */ s(Zr, { onMessage: n }) : this.mode === "tag-feature" ? /* @__PURE__ */ s(
      us,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    ) : /* @__PURE__ */ s(
      Lr,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState,
        guideId: this.guideId,
        templateId: this.templateId
      }
    );
    we(
      /* @__PURE__ */ s(dr, { client: hs, children: r }),
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
  <style>${Sr}</style>
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
    const i = t.clientX - this.dragStartX, n = t.clientY - this.dragStartY, r = window.innerWidth, o = window.innerHeight, a = this.iframe.offsetWidth, l = Math.max(-a + 50, Math.min(i, r - 50)), u = Math.max(0, Math.min(n, o - 100));
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
const ps = "visual-designer-guides", Ti = "1.0.0";
class ms {
  storageKey;
  constructor(t = ps) {
    this.storageKey = t;
  }
  getGuides() {
    try {
      const t = localStorage.getItem(this.storageKey);
      if (!t) return [];
      const i = JSON.parse(t);
      return i.version !== Ti ? (this.clear(), []) : i.guides || [];
    } catch {
      return [];
    }
  }
  getGuidesByPage(t) {
    return this.getGuides().filter((n) => n.page === t && n.status === "active");
  }
  saveGuide(t) {
    const i = this.getGuides(), n = i.findIndex((o) => o.id === t.id), r = {
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
    const i = { guides: t, version: Ti };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(t) {
    return this.getGuides().find((i) => i.id === t) || null;
  }
}
function gs({ onExit: e }) {
  const t = {
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
      style: t,
      onClick: e,
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
function ys() {
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
function _s() {
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
function vs() {
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
function bs(e) {
  return /* @__PURE__ */ s(q, { children: [
    e.showExitButton && /* @__PURE__ */ s(gs, { onExit: e.onExitEditor }),
    e.showRedBorder && /* @__PURE__ */ s(ys, {}),
    e.showBadge && /* @__PURE__ */ s(_s, {}),
    e.showLoading && /* @__PURE__ */ s(vs, {})
  ] });
}
function ws(e, t) {
  we(/* @__PURE__ */ s(bs, { ...t }), e);
}
class on {
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
  constructor(t = {}) {
    this.config = t, this.guideId = t.guideId ?? null, this.templateId = t.templateId ?? null, this.storage = new ms(t.storageKey), this.editorMode = new hn(), this.guideRenderer = new wn(), this.featureHeatmapRenderer = new xn(), this.editorFrame = new fs();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((i) => this.config.onGuideDismissed?.(i)), this.shouldEnableEditorMode() ? (this.showLoading = !0, this.renderOverlays(), this.enableEditor()) : this.loadGuides(), this.heatmapEnabled = localStorage.getItem("designerHeatmapEnabled") === "true", this.renderFeatureHeatmap(), this.setupEventListeners();
  }
  enableEditor() {
    if (this.isEditorMode) return;
    this.isEditorMode = !0;
    let t = typeof window < "u" && window.__visualDesignerMode || null;
    t || (t = localStorage.getItem("designerModeType") || null), this.editorFrame.create((n) => this.handleEditorMessage(n), t, {
      guideId: this.guideId,
      templateId: this.templateId
    });
    const i = t === "tag-page" || t === "tag-feature";
    this.ensureSDKRoot(), this.renderOverlays(), localStorage.setItem("designerMode", "true"), t && localStorage.setItem("designerModeType", t), setTimeout(() => {
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
    return this.storage.getGuidesByPage(Ae());
  }
  saveGuide(t) {
    const i = {
      ...t,
      id: dn(),
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
  async fetchGuides() {
    try {
      const i = (await (await Promise.resolve().then(() => Cr)).apiClient.get("/guides")).data.map((n) => ({
        id: n.guide_id,
        page: n.target_page || "",
        selector: n.target_segment || "",
        content: n.description || "",
        placement: n.placement || "right",
        status: n.status,
        target_page: n.target_page,
        target_segment: n.target_segment,
        templates: n.templates || [],
        steps: n.steps || []
      }));
      i.forEach((n) => this.storage.saveGuide(n)), this.loadGuides(), console.log(`[Visual Designer] Successfully fetched and rendered ${i.length} guides.`);
    } catch (t) {
      console.error("[Visual Designer] Failed to fetch guides:", t);
    }
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
      page: Ae()
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
    this.ensureSDKRoot(), this.sdkRoot && ws(this.sdkRoot, {
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
let G = null, an = !1;
const Tt = "designerGuideId", kt = "designerTemplateId";
let It = null, Pt = null;
function Ss() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(Tt) : null;
  } catch {
    return null;
  }
}
function xs() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(kt) : null;
  } catch {
    return null;
  }
}
function pe(e) {
  return G || (G = new on({
    ...e,
    guideId: It ?? e?.guideId ?? Ss() ?? null,
    templateId: Pt ?? e?.templateId ?? xs() ?? null
  }), G.init(), G);
}
function Ie() {
  return G;
}
function ln(e) {
  !e || !Array.isArray(e) || e.forEach((t) => {
    if (!t || !Array.isArray(t) || t.length === 0) return;
    const i = t[0], n = t.slice(1);
    try {
      switch (i) {
        case "initialize":
          pe(n[0]);
          break;
        case "identify":
          n[0] && console.log("[Visual Designer] identify (snippet) called with:", n[0]);
          break;
        case "enableEditor":
          (G ?? pe()).enableEditor();
          break;
        case "disableEditor":
          G?.disableEditor();
          break;
        case "loadGuides":
          G?.loadGuides();
          break;
        case "getGuides":
          return G?.getGuides();
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
  e && Array.isArray(e._q) && (an = !0, e.initialize = (t) => pe(t), e.identify = (t) => {
    t && console.log("[Visual Designer] identify (snippet) called with:", t);
  }, e.enableEditor = () => (G ?? pe()).enableEditor(), e.disableEditor = () => G?.disableEditor(), e.loadGuides = () => G?.loadGuides(), e.getGuides = () => G?.getGuides(), e.getInstance = Ie, e.init = pe, ln(e._q));
  try {
    const t = new URL(window.location.href), i = t.searchParams.get("designer"), n = t.searchParams.get("mode"), r = t.searchParams.get("iud"), o = t.searchParams.get("guide_id"), a = t.searchParams.get("template_id"), l = {
      designer: i,
      designerModeType: n,
      iud: r,
      guide_id: o,
      template_id: a
    };
    (i === "true" || o != null || a != null) && console.log("[Visual Designer] URL params:", l), i === "true" ? (n && (window.__visualDesignerMode = n, localStorage.setItem("designerModeType", n)), localStorage.setItem("designerMode", "true"), r && localStorage.setItem(Nt, r), o != null && (It = o, localStorage.setItem(Tt, o)), a != null && (Pt = a, localStorage.setItem(kt, a)), t.searchParams.delete("designer"), t.searchParams.delete("mode"), t.searchParams.delete("iud"), t.searchParams.delete("guide_id"), t.searchParams.delete("template_id"), window.history.replaceState({}, "", t.toString()), window.__visualDesignerWasLaunched = !0) : (o != null || a != null) && (o != null && (It = o, localStorage.setItem(Tt, o)), a != null && (Pt = a, localStorage.setItem(kt, a)), t.searchParams.delete("guide_id"), t.searchParams.delete("template_id"), window.history.replaceState({}, "", t.toString()));
  } catch {
  }
}
if (typeof window < "u" && !G && !an) {
  const e = () => {
    G || pe();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
typeof window < "u" && (window.VisualDesigner = {
  init: pe,
  initialize: pe,
  getInstance: Ie,
  DesignerSDK: on,
  apiClient: J,
  _processQueue: ln,
  loadGuides: () => Ie()?.loadGuides(),
  fetchGuides: () => Ie()?.fetchGuides(),
  getGuideId: () => Ie()?.getGuideId() ?? null,
  getTemplateId: () => Ie()?.getTemplateId() ?? null
});
export {
  on as DesignerSDK,
  ln as _processQueue,
  J as apiClient,
  Ie as getInstance,
  pe as init
};
