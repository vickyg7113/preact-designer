class pe {
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
      const l = r[0], c = e.getAttribute(l);
      return {
        selector: `[${l}="${this.escapeAttribute(c)}"]`,
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
      const h = Array.from(l.children).filter((u) => u.tagName === n.tagName).indexOf(n) + 1;
      i.unshift(`${a}[${h}]`), n = l;
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
  /**
   * Waits for an element to appear in the DOM using MutationObserver.
   * Leverages findElement for consistent behavior with XPaths/Selectors.
   */
  static waitForElement(e, i = 5e3) {
    return new Promise((n, r) => {
      const o = this.findElement(e);
      if (o) return n(o);
      const a = new MutationObserver(() => {
        const l = this.findElement(e);
        l && (a.disconnect(), n(l));
      });
      a.observe(document.body, {
        childList: !0
      }), setTimeout(() => {
        a.disconnect(), r(new Error(`Element not found: ${e}`));
      }, i);
    });
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
      for (let c = 1; c < o.length; c++) l.push(this.buildSegment(o[c]));
    } else {
      const c = (n.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (c.length < 2) return null;
      const h = this.generatePathSelector(n);
      if (!h) return null;
      const u = c.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      l.push(`${h}:contains('${u}')`);
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
function Ln(t) {
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
function ri(t) {
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0" && t.getBoundingClientRect().height > 0 && t.getBoundingClientRect().width > 0;
}
function ze() {
  return window.location.pathname || "/";
}
function si() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Fn(t) {
  const e = t.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function _t(t) {
  Fn(t) || t.scrollIntoView({ behavior: "smooth", block: "center" });
}
const oi = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class Mn {
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
      if (i.closest(oi)) {
        this.hideHighlight();
        return;
      }
      if (!ri(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (e) => {
    if (!this.isActive) return;
    const i = e.target;
    i && (i.closest(oi) || (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), ri(i) && this.selectElement(i)));
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
    const i = pe.generateSelector(e), n = Ln(e), r = pe.getXPath(e);
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
var gt, I, Wi, ke, ai, Ki, Qi, Vi, $t, It, Tt, ji, qe = {}, qi = [], Nn = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, Xe = Array.isArray;
function ge(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function Wt(t) {
  t && t.parentNode && t.parentNode.removeChild(t);
}
function kt(t, e, i) {
  var n, r, o, a = {};
  for (o in e) o == "key" ? n = e[o] : o == "ref" ? r = e[o] : a[o] = e[o];
  if (arguments.length > 2 && (a.children = arguments.length > 3 ? gt.call(arguments, 2) : i), typeof t == "function" && t.defaultProps != null) for (o in t.defaultProps) a[o] === void 0 && (a[o] = t.defaultProps[o]);
  return at(t, a, n, r, null);
}
function at(t, e, i, n, r) {
  var o = { type: t, props: e, key: i, ref: n, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: r ?? ++Wi, __i: -1, __u: 0 };
  return r == null && I.vnode != null && I.vnode(o), o;
}
function oe(t) {
  return t.children;
}
function me(t, e) {
  this.props = t, this.context = e;
}
function Ue(t, e) {
  if (e == null) return t.__ ? Ue(t.__, t.__i + 1) : null;
  for (var i; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) return i.__e;
  return typeof t.type == "function" ? Ue(t) : null;
}
function Yi(t) {
  var e, i;
  if ((t = t.__) != null && t.__c != null) {
    for (t.__e = t.__c.base = null, e = 0; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) {
      t.__e = t.__c.base = i.__e;
      break;
    }
    return Yi(t);
  }
}
function Rt(t) {
  (!t.__d && (t.__d = !0) && ke.push(t) && !dt.__r++ || ai != I.debounceRendering) && ((ai = I.debounceRendering) || Ki)(dt);
}
function dt() {
  for (var t, e, i, n, r, o, a, l = 1; ke.length; ) ke.length > l && ke.sort(Qi), t = ke.shift(), l = ke.length, t.__d && (i = void 0, n = void 0, r = (n = (e = t).__v).__e, o = [], a = [], e.__P && ((i = ge({}, n)).__v = n.__v + 1, I.vnode && I.vnode(i), Kt(e.__P, i, n, e.__n, e.__P.namespaceURI, 32 & n.__u ? [r] : null, o, r ?? Ue(n), !!(32 & n.__u), a), i.__v = n.__v, i.__.__k[i.__i] = i, Zi(o, i, a), n.__e = n.__ = null, i.__e != r && Yi(i)));
  dt.__r = 0;
}
function Xi(t, e, i, n, r, o, a, l, c, h, u) {
  var d, p, g, y, b, E, x, m = n && n.__k || qi, P = e.length;
  for (c = zn(i, e, m, c, P), d = 0; d < P; d++) (g = i.__k[d]) != null && (p = g.__i == -1 ? qe : m[g.__i] || qe, g.__i = d, E = Kt(t, g, p, r, o, a, l, c, h, u), y = g.__e, g.ref && p.ref != g.ref && (p.ref && Qt(p.ref, null, g), u.push(g.ref, g.__c || y, g)), b == null && y != null && (b = y), (x = !!(4 & g.__u)) || p.__k === g.__k ? c = Ji(g, c, t, x) : typeof g.type == "function" && E !== void 0 ? c = E : y && (c = y.nextSibling), g.__u &= -7);
  return i.__e = b, c;
}
function zn(t, e, i, n, r) {
  var o, a, l, c, h, u = i.length, d = u, p = 0;
  for (t.__k = new Array(r), o = 0; o < r; o++) (a = e[o]) != null && typeof a != "boolean" && typeof a != "function" ? (typeof a == "string" || typeof a == "number" || typeof a == "bigint" || a.constructor == String ? a = t.__k[o] = at(null, a, null, null, null) : Xe(a) ? a = t.__k[o] = at(oe, { children: a }, null, null, null) : a.constructor === void 0 && a.__b > 0 ? a = t.__k[o] = at(a.type, a.props, a.key, a.ref ? a.ref : null, a.__v) : t.__k[o] = a, c = o + p, a.__ = t, a.__b = t.__b + 1, l = null, (h = a.__i = Un(a, i, c, d)) != -1 && (d--, (l = i[h]) && (l.__u |= 2)), l == null || l.__v == null ? (h == -1 && (r > u ? p-- : r < u && p++), typeof a.type != "function" && (a.__u |= 4)) : h != c && (h == c - 1 ? p-- : h == c + 1 ? p++ : (h > c ? p-- : p++, a.__u |= 4))) : t.__k[o] = null;
  if (d) for (o = 0; o < u; o++) (l = i[o]) != null && (2 & l.__u) == 0 && (l.__e == n && (n = Ue(l)), tn(l, l));
  return n;
}
function Ji(t, e, i, n) {
  var r, o;
  if (typeof t.type == "function") {
    for (r = t.__k, o = 0; r && o < r.length; o++) r[o] && (r[o].__ = t, e = Ji(r[o], e, i, n));
    return e;
  }
  t.__e != e && (n && (e && t.type && !e.parentNode && (e = Ue(t)), i.insertBefore(t.__e, e || null)), e = t.__e);
  do
    e = e && e.nextSibling;
  while (e != null && e.nodeType == 8);
  return e;
}
function ut(t, e) {
  return e = e || [], t == null || typeof t == "boolean" || (Xe(t) ? t.some(function(i) {
    ut(i, e);
  }) : e.push(t)), e;
}
function Un(t, e, i, n) {
  var r, o, a, l = t.key, c = t.type, h = e[i], u = h != null && (2 & h.__u) == 0;
  if (h === null && l == null || u && l == h.key && c == h.type) return i;
  if (n > (u ? 1 : 0)) {
    for (r = i - 1, o = i + 1; r >= 0 || o < e.length; ) if ((h = e[a = r >= 0 ? r-- : o++]) != null && (2 & h.__u) == 0 && l == h.key && c == h.type) return a;
  }
  return -1;
}
function li(t, e, i) {
  e[0] == "-" ? t.setProperty(e, i ?? "") : t[e] = i == null ? "" : typeof i != "number" || Nn.test(e) ? i : i + "px";
}
function et(t, e, i, n, r) {
  var o, a;
  e: if (e == "style") if (typeof i == "string") t.style.cssText = i;
  else {
    if (typeof n == "string" && (t.style.cssText = n = ""), n) for (e in n) i && e in i || li(t.style, e, "");
    if (i) for (e in i) n && i[e] == n[e] || li(t.style, e, i[e]);
  }
  else if (e[0] == "o" && e[1] == "n") o = e != (e = e.replace(Vi, "$1")), a = e.toLowerCase(), e = a in t || e == "onFocusOut" || e == "onFocusIn" ? a.slice(2) : e.slice(2), t.l || (t.l = {}), t.l[e + o] = i, i ? n ? i.u = n.u : (i.u = $t, t.addEventListener(e, o ? Tt : It, o)) : t.removeEventListener(e, o ? Tt : It, o);
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
function ci(t) {
  return function(e) {
    if (this.l) {
      var i = this.l[e.type + t];
      if (e.t == null) e.t = $t++;
      else if (e.t < i.u) return;
      return i(I.event ? I.event(e) : e);
    }
  };
}
function Kt(t, e, i, n, r, o, a, l, c, h) {
  var u, d, p, g, y, b, E, x, m, P, D, M, H, N, R, z, j, O = e.type;
  if (e.constructor !== void 0) return null;
  128 & i.__u && (c = !!(32 & i.__u), o = [l = e.__e = i.__e]), (u = I.__b) && u(e);
  e: if (typeof O == "function") try {
    if (x = e.props, m = "prototype" in O && O.prototype.render, P = (u = O.contextType) && n[u.__c], D = u ? P ? P.props.value : u.__ : n, i.__c ? E = (d = e.__c = i.__c).__ = d.__E : (m ? e.__c = d = new O(x, D) : (e.__c = d = new me(x, D), d.constructor = O, d.render = Gn), P && P.sub(d), d.state || (d.state = {}), d.__n = n, p = d.__d = !0, d.__h = [], d._sb = []), m && d.__s == null && (d.__s = d.state), m && O.getDerivedStateFromProps != null && (d.__s == d.state && (d.__s = ge({}, d.__s)), ge(d.__s, O.getDerivedStateFromProps(x, d.__s))), g = d.props, y = d.state, d.__v = e, p) m && O.getDerivedStateFromProps == null && d.componentWillMount != null && d.componentWillMount(), m && d.componentDidMount != null && d.__h.push(d.componentDidMount);
    else {
      if (m && O.getDerivedStateFromProps == null && x !== g && d.componentWillReceiveProps != null && d.componentWillReceiveProps(x, D), e.__v == i.__v || !d.__e && d.shouldComponentUpdate != null && d.shouldComponentUpdate(x, d.__s, D) === !1) {
        for (e.__v != i.__v && (d.props = x, d.state = d.__s, d.__d = !1), e.__e = i.__e, e.__k = i.__k, e.__k.some(function(K) {
          K && (K.__ = e);
        }), M = 0; M < d._sb.length; M++) d.__h.push(d._sb[M]);
        d._sb = [], d.__h.length && a.push(d);
        break e;
      }
      d.componentWillUpdate != null && d.componentWillUpdate(x, d.__s, D), m && d.componentDidUpdate != null && d.__h.push(function() {
        d.componentDidUpdate(g, y, b);
      });
    }
    if (d.context = D, d.props = x, d.__P = t, d.__e = !1, H = I.__r, N = 0, m) {
      for (d.state = d.__s, d.__d = !1, H && H(e), u = d.render(d.props, d.state, d.context), R = 0; R < d._sb.length; R++) d.__h.push(d._sb[R]);
      d._sb = [];
    } else do
      d.__d = !1, H && H(e), u = d.render(d.props, d.state, d.context), d.state = d.__s;
    while (d.__d && ++N < 25);
    d.state = d.__s, d.getChildContext != null && (n = ge(ge({}, n), d.getChildContext())), m && !p && d.getSnapshotBeforeUpdate != null && (b = d.getSnapshotBeforeUpdate(g, y)), z = u, u != null && u.type === oe && u.key == null && (z = en(u.props.children)), l = Xi(t, Xe(z) ? z : [z], e, i, n, r, o, a, l, c, h), d.base = e.__e, e.__u &= -161, d.__h.length && a.push(d), E && (d.__E = d.__ = null);
  } catch (K) {
    if (e.__v = null, c || o != null) if (K.then) {
      for (e.__u |= c ? 160 : 128; l && l.nodeType == 8 && l.nextSibling; ) l = l.nextSibling;
      o[o.indexOf(l)] = null, e.__e = l;
    } else {
      for (j = o.length; j--; ) Wt(o[j]);
      Ot(e);
    }
    else e.__e = i.__e, e.__k = i.__k, K.then || Ot(e);
    I.__e(K, e, i);
  }
  else o == null && e.__v == i.__v ? (e.__k = i.__k, e.__e = i.__e) : l = e.__e = Bn(i.__e, e, i, n, r, o, a, c, h);
  return (u = I.diffed) && u(e), 128 & e.__u ? void 0 : l;
}
function Ot(t) {
  t && t.__c && (t.__c.__e = !0), t && t.__k && t.__k.forEach(Ot);
}
function Zi(t, e, i) {
  for (var n = 0; n < i.length; n++) Qt(i[n], i[++n], i[++n]);
  I.__c && I.__c(e, t), t.some(function(r) {
    try {
      t = r.__h, r.__h = [], t.some(function(o) {
        o.call(r);
      });
    } catch (o) {
      I.__e(o, r.__v);
    }
  });
}
function en(t) {
  return typeof t != "object" || t == null || t.__b && t.__b > 0 ? t : Xe(t) ? t.map(en) : ge({}, t);
}
function Bn(t, e, i, n, r, o, a, l, c) {
  var h, u, d, p, g, y, b, E = i.props || qe, x = e.props, m = e.type;
  if (m == "svg" ? r = "http://www.w3.org/2000/svg" : m == "math" ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), o != null) {
    for (h = 0; h < o.length; h++) if ((g = o[h]) && "setAttribute" in g == !!m && (m ? g.localName == m : g.nodeType == 3)) {
      t = g, o[h] = null;
      break;
    }
  }
  if (t == null) {
    if (m == null) return document.createTextNode(x);
    t = document.createElementNS(r, m, x.is && x), l && (I.__m && I.__m(e, o), l = !1), o = null;
  }
  if (m == null) E === x || l && t.data == x || (t.data = x);
  else {
    if (o = o && gt.call(t.childNodes), !l && o != null) for (E = {}, h = 0; h < t.attributes.length; h++) E[(g = t.attributes[h]).name] = g.value;
    for (h in E) if (g = E[h], h != "children") {
      if (h == "dangerouslySetInnerHTML") d = g;
      else if (!(h in x)) {
        if (h == "value" && "defaultValue" in x || h == "checked" && "defaultChecked" in x) continue;
        et(t, h, null, g, r);
      }
    }
    for (h in x) g = x[h], h == "children" ? p = g : h == "dangerouslySetInnerHTML" ? u = g : h == "value" ? y = g : h == "checked" ? b = g : l && typeof g != "function" || E[h] === g || et(t, h, g, E[h], r);
    if (u) l || d && (u.__html == d.__html || u.__html == t.innerHTML) || (t.innerHTML = u.__html), e.__k = [];
    else if (d && (t.innerHTML = ""), Xi(e.type == "template" ? t.content : t, Xe(p) ? p : [p], e, i, n, m == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r, o, a, o ? o[0] : i.__k && Ue(i, 0), l, c), o != null) for (h = o.length; h--; ) Wt(o[h]);
    l || (h = "value", m == "progress" && y == null ? t.removeAttribute("value") : y != null && (y !== t[h] || m == "progress" && !y || m == "option" && y != E[h]) && et(t, h, y, E[h], r), h = "checked", b != null && b != t[h] && et(t, h, b, E[h], r));
  }
  return t;
}
function Qt(t, e, i) {
  try {
    if (typeof t == "function") {
      var n = typeof t.__u == "function";
      n && t.__u(), n && e == null || (t.__u = t(e));
    } else t.current = e;
  } catch (r) {
    I.__e(r, i);
  }
}
function tn(t, e, i) {
  var n, r;
  if (I.unmount && I.unmount(t), (n = t.ref) && (n.current && n.current != t.__e || Qt(n, null, e)), (n = t.__c) != null) {
    if (n.componentWillUnmount) try {
      n.componentWillUnmount();
    } catch (o) {
      I.__e(o, e);
    }
    n.base = n.__P = null;
  }
  if (n = t.__k) for (r = 0; r < n.length; r++) n[r] && tn(n[r], e, i || typeof t.type != "function");
  i || Wt(t.__e), t.__c = t.__ = t.__e = void 0;
}
function Gn(t, e, i) {
  return this.constructor(t, i);
}
function Oe(t, e, i) {
  var n, r, o, a;
  e == document && (e = document.documentElement), I.__ && I.__(t, e), r = (n = !1) ? null : e.__k, o = [], a = [], Kt(e, t = e.__k = kt(oe, null, [t]), r || qe, qe, e.namespaceURI, r ? null : e.firstChild ? gt.call(e.childNodes) : null, o, r ? r.__e : e.firstChild, n, a), Zi(o, t, a);
}
function Vt(t) {
  function e(i) {
    var n, r;
    return this.getChildContext || (n = /* @__PURE__ */ new Set(), (r = {})[e.__c] = this, this.getChildContext = function() {
      return r;
    }, this.componentWillUnmount = function() {
      n = null;
    }, this.shouldComponentUpdate = function(o) {
      this.props.value != o.value && n.forEach(function(a) {
        a.__e = !0, Rt(a);
      });
    }, this.sub = function(o) {
      n.add(o);
      var a = o.componentWillUnmount;
      o.componentWillUnmount = function() {
        n && n.delete(o), a && a.call(o);
      };
    }), i.children;
  }
  return e.__c = "__cC" + ji++, e.__ = t, e.Provider = e.__l = (e.Consumer = function(i, n) {
    return i.children(n);
  }).contextType = e, e;
}
gt = qi.slice, I = { __e: function(t, e, i, n) {
  for (var r, o, a; e = e.__; ) if ((r = e.__c) && !r.__) try {
    if ((o = r.constructor) && o.getDerivedStateFromError != null && (r.setState(o.getDerivedStateFromError(t)), a = r.__d), r.componentDidCatch != null && (r.componentDidCatch(t, n || {}), a = r.__d), a) return r.__E = r;
  } catch (l) {
    t = l;
  }
  throw t;
} }, Wi = 0, me.prototype.setState = function(t, e) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = ge({}, this.state), typeof t == "function" && (t = t(ge({}, i), this.props)), t && ge(i, t), t != null && this.__v && (e && this._sb.push(e), Rt(this));
}, me.prototype.forceUpdate = function(t) {
  this.__v && (this.__e = !0, t && this.__h.push(t), Rt(this));
}, me.prototype.render = oe, ke = [], Ki = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, Qi = function(t, e) {
  return t.__v.__b - e.__v.__b;
}, dt.__r = 0, Vi = /(PointerCapture)$|Capture$/i, $t = 0, It = ci(!1), Tt = ci(!0), ji = 0;
var Hn = 0;
function s(t, e, i, n, r, o) {
  e || (e = {});
  var a, l, c = e;
  if ("ref" in c) for (l in c = {}, e) l == "ref" ? a = e[l] : c[l] = e[l];
  var h = { type: t, props: c, key: i, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --Hn, __i: -1, __u: 0, __source: r, __self: o };
  if (typeof t == "function" && (a = t.defaultProps)) for (l in a) c[l] === void 0 && (c[l] = a[l]);
  return I.vnode && I.vnode(h), h;
}
const _ = {
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
function $n({ guide: t, top: e, left: i, arrowStyle: n, onDismiss: r }) {
  return /* @__PURE__ */ s(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": t.id,
      style: {
        position: "absolute",
        background: _.bg,
        border: `2px solid ${_.primary}`,
        borderRadius: _.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: _.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: _.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: _.text,
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
              background: _.primary,
              color: _.bg,
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
var Ae, B, vt, di, ht = 0, nn = [], $ = I, ui = $.__b, hi = $.__r, fi = $.diffed, pi = $.__c, gi = $.unmount, mi = $.__;
function Je(t, e) {
  $.__h && $.__h(B, t, ht || e), ht = 0;
  var i = B.__H || (B.__H = { __: [], __h: [] });
  return t >= i.__.length && i.__.push({}), i.__[t];
}
function C(t) {
  return ht = 1, Wn(rn, t);
}
function Wn(t, e, i) {
  var n = Je(Ae++, 2);
  if (n.t = t, !n.__c && (n.__ = [i ? i(e) : rn(void 0, e), function(l) {
    var c = n.__N ? n.__N[0] : n.__[0], h = n.t(c, l);
    c !== h && (n.__N = [h, n.__[1]], n.__c.setState({}));
  }], n.__c = B, !B.__f)) {
    var r = function(l, c, h) {
      if (!n.__c.__H) return !0;
      var u = n.__c.__H.__.filter(function(p) {
        return !!p.__c;
      });
      if (u.every(function(p) {
        return !p.__N;
      })) return !o || o.call(this, l, c, h);
      var d = n.__c.props !== l;
      return u.forEach(function(p) {
        if (p.__N) {
          var g = p.__[0];
          p.__ = p.__N, p.__N = void 0, g !== p.__[0] && (d = !0);
        }
      }), o && o.call(this, l, c, h) || d;
    };
    B.__f = !0;
    var o = B.shouldComponentUpdate, a = B.componentWillUpdate;
    B.componentWillUpdate = function(l, c, h) {
      if (this.__e) {
        var u = o;
        o = void 0, r(l, c, h), o = u;
      }
      a && a.call(this, l, c, h);
    }, B.shouldComponentUpdate = r;
  }
  return n.__N || n.__;
}
function q(t, e) {
  var i = Je(Ae++, 3);
  !$.__s && qt(i.__H, e) && (i.__ = t, i.u = e, B.__H.__h.push(i));
}
function Kn(t, e) {
  var i = Je(Ae++, 4);
  !$.__s && qt(i.__H, e) && (i.__ = t, i.u = e, B.__h.push(i));
}
function Ee(t, e) {
  var i = Je(Ae++, 7);
  return qt(i.__H, e) && (i.__ = t(), i.__H = e, i.__h = t), i.__;
}
function ce(t, e) {
  return ht = 8, Ee(function() {
    return t;
  }, e);
}
function jt(t) {
  var e = B.context[t.__c], i = Je(Ae++, 9);
  return i.c = t, e ? (i.__ == null && (i.__ = !0, e.sub(B)), e.props.value) : t.__;
}
function Qn() {
  for (var t; t = nn.shift(); ) if (t.__P && t.__H) try {
    t.__H.__h.forEach(lt), t.__H.__h.forEach(At), t.__H.__h = [];
  } catch (e) {
    t.__H.__h = [], $.__e(e, t.__v);
  }
}
$.__b = function(t) {
  B = null, ui && ui(t);
}, $.__ = function(t, e) {
  t && e.__k && e.__k.__m && (t.__m = e.__k.__m), mi && mi(t, e);
}, $.__r = function(t) {
  hi && hi(t), Ae = 0;
  var e = (B = t.__c).__H;
  e && (vt === B ? (e.__h = [], B.__h = [], e.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (e.__h.forEach(lt), e.__h.forEach(At), e.__h = [], Ae = 0)), vt = B;
}, $.diffed = function(t) {
  fi && fi(t);
  var e = t.__c;
  e && e.__H && (e.__H.__h.length && (nn.push(e) !== 1 && di === $.requestAnimationFrame || ((di = $.requestAnimationFrame) || Vn)(Qn)), e.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), vt = B = null;
}, $.__c = function(t, e) {
  e.some(function(i) {
    try {
      i.__h.forEach(lt), i.__h = i.__h.filter(function(n) {
        return !n.__ || At(n);
      });
    } catch (n) {
      e.some(function(r) {
        r.__h && (r.__h = []);
      }), e = [], $.__e(n, i.__v);
    }
  }), pi && pi(t, e);
}, $.unmount = function(t) {
  gi && gi(t);
  var e, i = t.__c;
  i && i.__H && (i.__H.__.forEach(function(n) {
    try {
      lt(n);
    } catch (r) {
      e = r;
    }
  }), i.__H = void 0, e && $.__e(e, i.__v));
};
var yi = typeof requestAnimationFrame == "function";
function Vn(t) {
  var e, i = function() {
    clearTimeout(n), yi && cancelAnimationFrame(e), setTimeout(t);
  }, n = setTimeout(i, 35);
  yi && (e = requestAnimationFrame(i));
}
function lt(t) {
  var e = B, i = t.__c;
  typeof i == "function" && (t.__c = void 0, i()), B = e;
}
function At(t) {
  var e = B;
  t.__c = t.__(), B = e;
}
function qt(t, e) {
  return !t || t.length !== e.length || e.some(function(i, n) {
    return i !== t[n];
  });
}
function rn(t, e) {
  return typeof e == "function" ? e(t) : e;
}
const sn = "Template", on = "Description", jn = "Next";
function qn(t) {
  try {
    return JSON.parse(t || "{}");
  } catch {
    return { title: sn, description: on };
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
  fontFamily: _.fontFamily
};
function Xn({
  title: t = sn,
  description: e = on,
  buttonContent: i = jn,
  onNext: n,
  onBack: r,
  isFirstStep: o = !1
}) {
  return /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: 4, position: "relative" }, children: [
    /* @__PURE__ */ s("h3", { style: { fontSize: 14, fontWeight: 600, color: "#1855BC", lineHeight: 1.3, margin: 0 }, children: t }),
    /* @__PURE__ */ s("p", { style: { fontSize: 11, color: "#6b7280", lineHeight: 1.4, margin: 0 }, children: e }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: 8, justifyContent: "center", paddingTop: 4 }, children: [
      !o && /* @__PURE__ */ s(
        "button",
        {
          onClick: (a) => {
            a.stopPropagation(), r?.();
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
      /* @__PURE__ */ s(
        "button",
        {
          onClick: (a) => {
            a.stopPropagation(), n?.();
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
          onMouseEnter: (a) => a.currentTarget.style.opacity = "0.9",
          onMouseLeave: (a) => a.currentTarget.style.opacity = "1",
          children: i
        }
      )
    ] })
  ] });
}
function Jn({ template: t, top: e, left: i, onDismiss: n, onNext: r, onBack: o, isFirstStep: a, isLastStep: l }) {
  const c = Ee(() => qn(t.template.content), [t.template.content]), u = t.template.template_key === "tooltip-scratch";
  return /* @__PURE__ */ s(
    "div",
    {
      style: {
        position: "absolute",
        top: `${e}px`,
        left: `${i}px`,
        zIndex: _.zIndex.tooltip,
        pointerEvents: "auto",
        maxWidth: 300,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "top, left"
      },
      children: /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", margin: "0 auto", paddingTop: u ? 12 : 0 }, children: [
        u && /* @__PURE__ */ s(
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
              title: c.title,
              description: c.description,
              buttonContent: c.buttonContent,
              onNext: r,
              onBack: o,
              isFirstStep: a
            }
          )
        ] })
      ] })
    }
  );
}
function Zn({ block: t, onNext: e, onBack: i, onDismiss: n, onAction: r, isFirstStep: o, isLastStep: a }) {
  const { type: l, settings: c } = t, [h, u] = C(null), d = { fontFamily: _.fontFamily };
  switch (l) {
    case "text":
      const p = c.themeStyle === "title";
      return /* @__PURE__ */ s("div", { style: {
        ...d,
        fontSize: p ? "22px" : "15px",
        fontWeight: p ? 700 : 400,
        color: p ? _.text : _.textMuted,
        lineHeight: 1.4,
        margin: p ? "0 0 12px 0" : "0 0 8px 0",
        textAlign: "center"
      }, children: c.content });
    case "poll-scale":
      const g = c.minValue ?? 1, y = c.maxValue ?? 5, b = Array.from({ length: y - g + 1 }, (m, P) => g + P);
      return /* @__PURE__ */ s("div", { style: { ...d, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ s("h3", { style: { fontSize: "18px", fontWeight: 700, textAlign: "center", margin: 0, color: _.text }, children: c.question }),
        /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px" }, children: b.map((m) => /* @__PURE__ */ s("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }, children: [
          /* @__PURE__ */ s(
            "button",
            {
              onClick: () => u(m),
              style: {
                width: "100%",
                aspectRatio: "1/1",
                maxWidth: "50px",
                borderRadius: "12px",
                border: `1.5px solid ${h === m ? _.primary : "#E2E8F0"}`,
                backgroundColor: h === m ? `${_.primary}15` : "#F8FAFC",
                color: h === m ? _.primary : "#64748B",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              children: m
            }
          ),
          c.showLabels && c.labels?.[m] && /* @__PURE__ */ s("span", { style: { fontSize: "10px", fontWeight: 600, color: h === m ? _.primary : "#94a3b8", textAlign: "center" }, children: c.labels[m] })
        ] }, m)) }),
        /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ s(
          "button",
          {
            onClick: e,
            style: {
              backgroundColor: "#222",
              color: "#fff",
              padding: "12px 40px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            },
            children: c.submitLabel || "Submit"
          }
        ) })
      ] });
    case "poll-text":
      return /* @__PURE__ */ s("div", { style: { ...d, display: "flex", flexDirection: "column", gap: "20px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ s(
          "div",
          {
            style: {
              ...d,
              fontSize: c.themeStyle === "title" ? "20px" : c.themeStyle === "sub-title" ? "16px" : "14px",
              fontWeight: c.themeStyle === "title" || c.themeStyle === "sub-title" ? 700 : 500,
              color: c.themeStyle === "title" ? "#1855BC" : c.themeStyle === "sub-title" ? "#222222" : "#475569",
              textAlign: "center",
              lineHeight: 1.6
            },
            dangerouslySetInnerHTML: { __html: c.question }
          }
        ),
        /* @__PURE__ */ s("div", { style: { width: "100%" }, children: /* @__PURE__ */ s(
          "textarea",
          {
            placeholder: c.placeholder || "Enter text here...",
            style: {
              ...d,
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
        ) }),
        /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ s(
          "button",
          {
            onClick: e,
            style: {
              backgroundColor: "#222222",
              color: "#fff",
              padding: "12px 40px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            },
            children: c.submitLabel || "Submit"
          }
        ) })
      ] });
    case "poll-yes-no":
      return /* @__PURE__ */ s("div", { style: { ...d, display: "flex", flexDirection: "column", gap: "20px", padding: "12px 0" }, children: [
        c.question && /* @__PURE__ */ s("h3", { style: { fontSize: "18px", fontWeight: 700, textAlign: "center", margin: 0, color: "#222222", lineHeight: 1.2 }, children: c.question }),
        /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "center", gap: "12px" }, children: [
          /* @__PURE__ */ s(
            "button",
            {
              onClick: e,
              style: {
                flex: 1,
                maxWidth: "120px",
                backgroundColor: "#222222",
                color: "#fff",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              },
              children: c.yesLabel || "Yes"
            }
          ),
          /* @__PURE__ */ s(
            "button",
            {
              onClick: e,
              style: {
                flex: 1,
                maxWidth: "120px",
                backgroundColor: "#222222",
                color: "#fff",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              },
              children: c.noLabel || "No"
            }
          )
        ] })
      ] });
    case "button":
      const E = (c.label || "").toLowerCase(), x = c.action || "next";
      return /* @__PURE__ */ s("div", { style: { display: "flex", gap: "12px", width: "100%", margin: "8px 0" }, children: [
        x === "next" && !o && /* @__PURE__ */ s(
          "button",
          {
            onClick: i,
            style: {
              flex: 1,
              padding: "12px 24px",
              borderRadius: "10px",
              border: `1.5px solid ${_.border}`,
              backgroundColor: "transparent",
              color: _.text,
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer"
            },
            children: "Back"
          }
        ),
        /* @__PURE__ */ s(
          "button",
          {
            onClick: () => {
              x === "next" ? e() : x === "dismiss" ? n() : x === "url" && c.url && r(c.url);
            },
            style: {
              flex: 2,
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: _.primary,
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)"
            },
            children: c.label || (a ? "Finish" : "Next")
          }
        )
      ] });
    case "image":
      return /* @__PURE__ */ s("div", { style: { width: "100%", backgroundColor: "#f1f5f9", display: "flex", justifyContent: "center", margin: "0 0 16px 0" }, children: /* @__PURE__ */ s(
        "img",
        {
          src: c.url,
          alt: "Guide Media",
          style: { width: "100%", maxHeight: "300px", objectFit: "cover" }
        }
      ) });
    case "video":
      return /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", paddingTop: "56.25%", margin: "0 0 16px 0" }, children: /* @__PURE__ */ s(
        "iframe",
        {
          src: c.url,
          style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" },
          allowFullScreen: !0
        }
      ) });
    case "horizontal-line":
      return /* @__PURE__ */ s("hr", { style: { border: "none", borderTop: `1px solid ${_.border}`, margin: "16px 0" } });
    default:
      return null;
  }
}
function er({
  content: t,
  onDismiss: e,
  onNext: i,
  onBack: n,
  onAction: r,
  isFirstStep: o,
  isLastStep: a
}) {
  const l = Ee(() => {
    try {
      return JSON.parse(t);
    } catch {
      return { title: "Untitled" };
    }
  }, [t]), c = Ee(() => {
    const u = l.layout || {}, d = {
      center: ["center", "center"],
      top: ["flex-start", "center"],
      bottom: ["flex-end", "center"],
      "top-left": ["flex-start", "flex-start"],
      "top-right": ["flex-start", "flex-end"],
      "bottom-left": ["flex-end", "flex-start"],
      "bottom-right": ["flex-end", "flex-end"]
    };
    let p = "center", g = "center";
    if (u.position && d[u.position])
      [p, g] = d[u.position];
    else if (u.verticalAlignment || u.horizontalAlignment) {
      const y = { top: "flex-start", center: "center", bottom: "flex-end" }, b = { left: "flex-start", center: "center", right: "flex-end" };
      p = y[u.verticalAlignment || "center"] ?? "center", g = b[u.horizontalAlignment || "center"] ?? "center";
    }
    return {
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: p,
      justifyContent: g,
      backgroundColor: l.backdropColor || "rgba(0, 0, 0, 0.5)",
      zIndex: _.zIndex.guides,
      pointerEvents: "auto",
      padding: "40px",
      // Prevent sticking to edges
      backdropFilter: "blur(2px)",
      transition: "all 0.3s ease-out"
    };
  }, [l]);
  return /* @__PURE__ */ s(
    "div",
    {
      className: "designer-guide-modal-overlay",
      onClick: (u) => {
        u.target === u.currentTarget && l.backdropDismiss !== !1 && e();
      },
      style: c,
      children: [
        /* @__PURE__ */ s(
          "div",
          {
            className: "designer-guide-modal-card",
            style: {
              position: "relative",
              width: "90%",
              maxWidth: "500px",
              backgroundColor: _.bg,
              borderRadius: "16px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              fontFamily: _.fontFamily,
              animation: "designer-modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            },
            onClick: (u) => u.stopPropagation(),
            children: [
              /* @__PURE__ */ s(
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
                  children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "20px" } })
                }
              ),
              /* @__PURE__ */ s("div", { style: { padding: "24px" }, children: l.blocks && l.blocks.length > 0 ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column" }, children: l.blocks.map((u) => /* @__PURE__ */ s(
                Zn,
                {
                  block: u,
                  onNext: i,
                  onBack: n,
                  onDismiss: e,
                  onAction: r,
                  isFirstStep: o,
                  isLastStep: a
                },
                u.id
              )) }) : (
                /* Fallback Legacy Rendering */
                /* @__PURE__ */ s("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ s("h2", { style: { margin: "0 0 12px 0", fontSize: "22px", fontWeight: 700, color: _.text }, children: l.title }),
                  l.body && /* @__PURE__ */ s("p", { style: { margin: 0, fontSize: "15px", color: _.textMuted }, children: l.body }),
                  /* @__PURE__ */ s("div", { style: { display: "flex", gap: "12px", marginTop: "24px" }, children: [
                    !o && /* @__PURE__ */ s(
                      "button",
                      {
                        onClick: n,
                        style: {
                          flex: 1,
                          padding: "12px 24px",
                          borderRadius: "10px",
                          border: `1.5px solid ${_.border}`,
                          backgroundColor: "transparent",
                          color: _.text,
                          fontSize: "15px",
                          fontWeight: 600,
                          cursor: "pointer"
                        },
                        children: "Back"
                      }
                    ),
                    /* @__PURE__ */ s(
                      "button",
                      {
                        onClick: i,
                        style: {
                          flex: 2,
                          padding: "12px 24px",
                          borderRadius: "10px",
                          border: "none",
                          backgroundColor: _.primary,
                          color: "#ffffff",
                          fontSize: "15px",
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)"
                        },
                        children: a ? "Finish" : l.cta1Text || "Next"
                      }
                    )
                  ] })
                ] })
              ) })
            ]
          }
        ),
        /* @__PURE__ */ s("style", { children: `
        @keyframes designer-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      ` })
      ]
    }
  );
}
function tr({ targetRect: t }) {
  if (!t) return null;
  const e = 5;
  return /* @__PURE__ */ s(
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
        zIndex: _.zIndex.overlay,
        overflow: "hidden"
      },
      children: /* @__PURE__ */ s(
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
function ir(t) {
  const e = { position: "absolute" };
  switch (t) {
    case "top":
      return { ...e, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${_.primary} transparent transparent transparent` };
    case "bottom":
      return { ...e, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${_.primary} transparent` };
    case "left":
      return { ...e, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${_.primary}` };
    default:
      return { ...e, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${_.primary} transparent transparent` };
  }
}
function _i(t, e, i, n) {
  const r = t.getBoundingClientRect();
  let o = 0, a = 0;
  switch (e) {
    case "top":
      o = r.top - n - 12, a = r.left + r.width / 2 - i / 2;
      break;
    case "bottom":
      o = r.bottom + 12, a = r.left + r.width / 2 - i / 2;
      break;
    case "left":
      o = r.top + r.height / 2 - n / 2, a = r.left - i - 12;
      break;
    default:
      o = r.top + r.height / 2 - n / 2, a = r.right + 12;
      break;
  }
  const l = window.innerWidth, c = window.innerHeight;
  return a < 10 ? a = 10 : a + i > l - 10 && (a = l - i - 10), o < 10 ? o = 10 : o + n > c - 10 && (o = c - n - 10), { top: o, left: a, arrowStyle: ir(e) };
}
class nr {
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
    const i = ze(), n = e.filter(
      (u) => u.page === i && u.status === "active" && !this.dismissedThisSession.has(u.id)
    );
    if (this.ensureContainer(), !this.container) return;
    const r = [], o = [];
    for (const u of n) {
      const d = pe.findElement(u.selector);
      if (!d) continue;
      _t(d);
      const p = _i(d, u.placement, 280, 80);
      r.push({ guide: u, target: d, pos: p });
    }
    if (this.triggeredGuide && !this.dismissedThisSession.has(this.triggeredGuide.guide_id)) {
      const p = [...(this.triggeredGuide.templates || []).filter((g) => g.is_active)].sort((g, y) => g.step_order - y.step_order)[this.currentStepIndex];
      if (p && p.x_path) {
        const g = pe.findElement(p.x_path);
        if (g) {
          _t(g);
          const y = _i(g, "bottom", 300, 160), b = g.getBoundingClientRect(), E = b.left + b.width / 2;
          y.left = E - 16 - 16;
          const x = window.innerWidth;
          y.left < 10 ? y.left = 10 : y.left + 300 > x - 10 && (y.left = x - 300 - 10), o.push({ template: p, target: g, pos: y, targetRect: b });
        } else
          console.warn(`[Visual Designer] Target element not found for template "${p.template_id}" using selector: ${p.x_path}`);
      }
    }
    const l = [...(this.triggeredGuide?.templates || []).filter((u) => u.is_active)].sort((u, d) => u.step_order - d.step_order), c = l[this.currentStepIndex], h = !c?.x_path;
    if (console.log("tooltips", r), console.log("triggeredTooltips", o), console.log("currentTemplate", c), console.log("isFloating", h), r.length === 0 && o.length === 0 && !c) {
      Oe(null, this.container);
      return;
    }
    Oe(
      /* @__PURE__ */ s(
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
            zIndex: _.zIndex.guides,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          },
          children: [
            o.length > 0 && /* @__PURE__ */ s(tr, { targetRect: o[0].targetRect }),
            r.map(({ guide: u, pos: d }) => /* @__PURE__ */ s(
              $n,
              {
                guide: u,
                top: d.top,
                left: d.left,
                arrowStyle: d.arrowStyle,
                onDismiss: () => this.dismissGuide(u.id)
              },
              u.id
            )),
            o.map(({ template: u, pos: d }) => /* @__PURE__ */ s(
              Jn,
              {
                template: u,
                top: d.top,
                left: d.left,
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === l.length - 1
              },
              this.triggeredGuide.guide_id
            )),
            h && c && /* @__PURE__ */ s(
              er,
              {
                content: c.template.content,
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                onAction: (u) => window.location.href = u,
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === l.length - 1
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
    const r = [...(e.templates || []).filter((o) => o.is_active)].sort((o, a) => o.step_order - a.step_order)[0];
    if (r && r.x_path)
      try {
        await pe.waitForElement(r.x_path);
      } catch (o) {
        console.warn(`[Visual Designer] Timeout waiting for first step element: ${r.x_path}`, o);
      }
    this.renderGuides(this.lastGuides);
  }
  handleBack() {
    if (!this.triggeredGuide || this.currentStepIndex === 0) return;
    this.currentStepIndex--;
    const n = [...(this.triggeredGuide.templates || []).filter((r) => r.is_active)].sort((r, o) => r.step_order - o.step_order)[this.currentStepIndex];
    if (n?.x_path) {
      const r = pe.findElement(n.x_path);
      r && _t(r);
    }
    this.renderGuides(this.lastGuides);
  }
  async handleNext() {
    if (!this.triggeredGuide) return;
    const i = [...(this.triggeredGuide.templates || []).filter((r) => r.is_active)].sort((r, o) => r.step_order - o.step_order), n = i[this.currentStepIndex];
    if (this.onNext(this.triggeredGuide, this.currentStepIndex, i.length), n && n.auto_click_target && n.x_path) {
      console.log(`[Visual Designer] Auto-clicking target element for step: ${n.template_id}`);
      const r = pe.findElement(n.x_path);
      r instanceof HTMLElement ? r.click() : r && r.click?.();
    }
    if (this.currentStepIndex < i.length - 1) {
      this.currentStepIndex++;
      const r = i[this.currentStepIndex];
      if (r && r.x_path)
        try {
          this.renderGuides(this.lastGuides), await pe.waitForElement(r.x_path);
        } catch {
          console.warn(`[Visual Designer] Target element not found for step: ${r.template_id}`);
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
    const i = this.lastGuides.find((n) => n.id === e);
    i && this.onDismiss({
      guide_id: i.id,
      guide_name: i.content || "Untitled Guide",
      templates: []
    }, 0), this.renderGuides(this.lastGuides);
  }
  clear() {
    this.dismissedThisSession.clear(), this.container && Oe(null, this.container);
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
      this.container = document.createElement("div"), this.container.id = "designer-guides-root", this.container.style.position = "fixed", this.container.style.top = "0", this.container.style.left = "0", this.container.style.width = "100vw", this.container.style.height = "100vh", this.container.style.pointerEvents = "none", this.container.style.zIndex = String(_.zIndex.guides), document.body.appendChild(this.container);
    }
  }
}
const vi = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function rr({ feature: t, color: e, rect: i }) {
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
        zIndex: _.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${e}`
      }
    }
  );
}
class sr {
  container = null;
  lastEnabled = !1;
  render(e, i) {
    if (this.lastEnabled = i, this.clear(), !i || e.length === 0) return;
    const n = e.filter((o) => (o.selector || "").trim() !== "");
    if (this.ensureContainer(), !this.container) return;
    const r = n.map((o, a) => {
      const l = pe.findElement(o.selector);
      if (!l) return null;
      const c = l.getBoundingClientRect(), h = vi[a % vi.length];
      return { feature: o, rect: c, color: h };
    }).filter(Boolean);
    r.length !== 0 && Oe(
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
            zIndex: _.zIndex.overlay - 1
          },
          children: r.map(({ feature: o, rect: a, color: l }) => /* @__PURE__ */ s(
            rr,
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
    this.container && Oe(null, this.container);
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
var Be = class {
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
}, or = {
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
}, ar = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = or;
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
}, Re = new ar();
function lr(t) {
  setTimeout(t, 0);
}
var Pe = typeof window > "u" || "Deno" in globalThis;
function ee() {
}
function cr(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function Pt(t) {
  return typeof t == "number" && t >= 0 && t !== 1 / 0;
}
function an(t, e) {
  return Math.max(t + (e || 0) - Date.now(), 0);
}
function we(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function le(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function bi(t, e) {
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
      if (e.queryHash !== Yt(a, e.options))
        return !1;
    } else if (!Ye(e.queryKey, a))
      return !1;
  }
  if (i !== "all") {
    const c = e.isActive();
    if (i === "active" && !c || i === "inactive" && c)
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
      if (De(e.options.mutationKey) !== De(o))
        return !1;
    } else if (!Ye(e.options.mutationKey, o))
      return !1;
  }
  return !(n && e.state.status !== n || r && !r(e));
}
function Yt(t, e) {
  return (e?.queryKeyHashFn || De)(t);
}
function De(t) {
  return JSON.stringify(
    t,
    (e, i) => Dt(i) ? Object.keys(i).sort().reduce((n, r) => (n[r] = i[r], n), {}) : i
  );
}
function Ye(t, e) {
  return t === e ? !0 : typeof t != typeof e ? !1 : t && e && typeof t == "object" && typeof e == "object" ? Object.keys(e).every((i) => Ye(t[i], e[i])) : !1;
}
var dr = Object.prototype.hasOwnProperty;
function ln(t, e, i = 0) {
  if (t === e)
    return t;
  if (i > 500) return e;
  const n = Si(t) && Si(e);
  if (!n && !(Dt(t) && Dt(e))) return e;
  const o = (n ? t : Object.keys(t)).length, a = n ? e : Object.keys(e), l = a.length, c = n ? new Array(l) : {};
  let h = 0;
  for (let u = 0; u < l; u++) {
    const d = n ? u : a[u], p = t[d], g = e[d];
    if (p === g) {
      c[d] = p, (n ? u < o : dr.call(t, d)) && h++;
      continue;
    }
    if (p === null || g === null || typeof p != "object" || typeof g != "object") {
      c[d] = g;
      continue;
    }
    const y = ln(p, g, i + 1);
    c[d] = y, y === p && h++;
  }
  return o === l && h === o ? t : c;
}
function ft(t, e) {
  if (!e || Object.keys(t).length !== Object.keys(e).length)
    return !1;
  for (const i in t)
    if (t[i] !== e[i])
      return !1;
  return !0;
}
function Si(t) {
  return Array.isArray(t) && t.length === Object.keys(t).length;
}
function Dt(t) {
  if (!wi(t))
    return !1;
  const e = t.constructor;
  if (e === void 0)
    return !0;
  const i = e.prototype;
  return !(!wi(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(t) !== Object.prototype);
}
function wi(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function ur(t) {
  return new Promise((e) => {
    Re.setTimeout(e, t);
  });
}
function Lt(t, e, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(t, e) : i.structuralSharing !== !1 ? ln(t, e) : e;
}
function hr(t, e, i = 0) {
  const n = [...t, e];
  return i && n.length > i ? n.slice(1) : n;
}
function fr(t, e, i = 0) {
  const n = [e, ...t];
  return i && n.length > i ? n.slice(0, -1) : n;
}
var Xt = /* @__PURE__ */ Symbol();
function cn(t, e) {
  return !t.queryFn && e?.initialPromise ? () => e.initialPromise : !t.queryFn || t.queryFn === Xt ? () => Promise.reject(new Error(`Missing queryFn: '${t.queryHash}'`)) : t.queryFn;
}
function Jt(t, e) {
  return typeof t == "function" ? t(...e) : !!t;
}
function pr(t, e, i) {
  let n = !1, r;
  return Object.defineProperty(t, "signal", {
    enumerable: !0,
    get: () => (r ??= e(), n || (n = !0, r.aborted ? i() : r.addEventListener("abort", i, { once: !0 })), r)
  }), t;
}
var gr = class extends Be {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!Pe && window.addEventListener) {
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
}, Zt = new gr();
function Ft() {
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
var mr = lr;
function yr() {
  let t = [], e = 0, i = (l) => {
    l();
  }, n = (l) => {
    l();
  }, r = mr;
  const o = (l) => {
    e ? t.push(l) : r(() => {
      i(l);
    });
  }, a = () => {
    const l = t;
    t = [], l.length && r(() => {
      n(() => {
        l.forEach((c) => {
          i(c);
        });
      });
    });
  };
  return {
    batch: (l) => {
      let c;
      e++;
      try {
        c = l();
      } finally {
        e--, e || a();
      }
      return c;
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: (l) => (...c) => {
      o(() => {
        l(...c);
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
var V = yr(), _r = class extends Be {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!Pe && window.addEventListener) {
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
}, pt = new _r();
function vr(t) {
  return Math.min(1e3 * 2 ** t, 3e4);
}
function dn(t) {
  return (t ?? "online") === "online" ? pt.isOnline() : !0;
}
var Mt = class extends Error {
  constructor(t) {
    super("CancelledError"), this.revert = t?.revert, this.silent = t?.silent;
  }
};
function un(t) {
  let e = !1, i = 0, n;
  const r = Ft(), o = () => r.status !== "pending", a = (b) => {
    if (!o()) {
      const E = new Mt(b);
      p(E), t.onCancel?.(E);
    }
  }, l = () => {
    e = !0;
  }, c = () => {
    e = !1;
  }, h = () => Zt.isFocused() && (t.networkMode === "always" || pt.isOnline()) && t.canRun(), u = () => dn(t.networkMode) && t.canRun(), d = (b) => {
    o() || (n?.(), r.resolve(b));
  }, p = (b) => {
    o() || (n?.(), r.reject(b));
  }, g = () => new Promise((b) => {
    n = (E) => {
      (o() || h()) && b(E);
    }, t.onPause?.();
  }).then(() => {
    n = void 0, o() || t.onContinue?.();
  }), y = () => {
    if (o())
      return;
    let b;
    const E = i === 0 ? t.initialPromise : void 0;
    try {
      b = E ?? t.fn();
    } catch (x) {
      b = Promise.reject(x);
    }
    Promise.resolve(b).then(d).catch((x) => {
      if (o())
        return;
      const m = t.retry ?? (Pe ? 0 : 3), P = t.retryDelay ?? vr, D = typeof P == "function" ? P(i, x) : P, M = m === !0 || typeof m == "number" && i < m || typeof m == "function" && m(i, x);
      if (e || !M) {
        p(x);
        return;
      }
      i++, t.onFail?.(i, x), ur(D).then(() => h() ? void 0 : g()).then(() => {
        e ? p(x) : y();
      });
    });
  };
  return {
    promise: r,
    status: () => r.status,
    cancel: a,
    continue: () => (n?.(), r),
    cancelRetry: l,
    continueRetry: c,
    canStart: u,
    start: () => (u() ? y() : g().then(y), r)
  };
}
var hn = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), Pt(this.gcTime) && (this.#e = Re.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(t) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      t ?? (Pe ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (Re.clearTimeout(this.#e), this.#e = void 0);
  }
}, br = class extends hn {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(t) {
    super(), this.#a = !1, this.#o = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.#r = t.client, this.#i = this.#r.getQueryCache(), this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.#e = Ci(this.options), this.state = t.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(t) {
    if (this.options = { ...this.#o, ...t }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const e = Ci(this.options);
      e.data !== void 0 && (this.setState(
        Ei(e.data, e.dataUpdatedAt)
      ), this.#e = e);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(t, e) {
    const i = Lt(this.state.data, t, this.options);
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
    return this.#n?.cancel(t), e ? e.then(ee).catch(ee) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({ silent: !0 });
  }
  reset() {
    this.destroy(), this.setState(this.#e);
  }
  isActive() {
    return this.observers.some(
      (t) => le(t.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === Xt || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => we(t.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => t.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(t = 0) {
    return this.state.data === void 0 ? !0 : t === "static" ? !1 : this.state.isInvalidated ? !0 : !an(this.state.dataUpdatedAt, t);
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
      const l = this.observers.find((c) => c.options.queryFn);
      l && this.setOptions(l.options);
    }
    const i = new AbortController(), n = (l) => {
      Object.defineProperty(l, "signal", {
        enumerable: !0,
        get: () => (this.#a = !0, i.signal)
      });
    }, r = () => {
      const l = cn(this.options, e), h = (() => {
        const u = {
          client: this.#r,
          queryKey: this.queryKey,
          meta: this.meta
        };
        return n(u), u;
      })();
      return this.#a = !1, this.options.persister ? this.options.persister(
        l,
        h,
        this
      ) : l(h);
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
    this.options.behavior?.onFetch(a, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#s({ type: "fetch", meta: a.fetchOptions?.meta }), this.#n = un({
      initialPromise: e?.initialPromise,
      fn: a.fetchFn,
      onCancel: (l) => {
        l instanceof Mt && l.revert && this.setState({
          ...this.#t,
          fetchStatus: "idle"
        }), i.abort();
      },
      onFail: (l, c) => {
        this.#s({ type: "failed", failureCount: l, error: c });
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
      if (l instanceof Mt) {
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
            ...fn(i.data, this.options),
            fetchMeta: t.meta ?? null
          };
        case "success":
          const n = {
            ...i,
            ...Ei(t.data, t.dataUpdatedAt),
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
    this.state = e(this.state), V.batch(() => {
      this.observers.forEach((i) => {
        i.onQueryUpdate();
      }), this.#i.notify({ query: this, type: "updated", action: t });
    });
  }
};
function fn(t, e) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: dn(e.networkMode) ? "fetching" : "paused",
    ...t === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function Ei(t, e) {
  return {
    data: t,
    dataUpdatedAt: e ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function Ci(t) {
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
var xr = class extends Be {
  constructor(t, e) {
    super(), this.options = e, this.#e = t, this.#s = null, this.#a = Ft(), this.bindMethods(), this.setOptions(e);
  }
  #e;
  #t = void 0;
  #i = void 0;
  #r = void 0;
  #n;
  #o;
  #a;
  #s;
  #g;
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
    this.listeners.size === 1 && (this.#t.addObserver(this), Ii(this.#t, this.options) ? this.#u() : this.updateResult(), this.#v());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return Nt(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return Nt(
      this.#t,
      this.options,
      this.options.refetchOnWindowFocus
    );
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set(), this.#b(), this.#x(), this.#t.removeObserver(this);
  }
  setOptions(t) {
    const e = this.options, i = this.#t;
    if (this.options = this.#e.defaultQueryOptions(t), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof le(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), e._defaulted && !ft(this.options, e) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const n = this.hasListeners();
    n && Ti(
      this.#t,
      i,
      this.options,
      e
    ) && this.#u(), this.updateResult(), n && (this.#t !== i || le(this.options.enabled, this.#t) !== le(e.enabled, this.#t) || we(this.options.staleTime, this.#t) !== we(e.staleTime, this.#t)) && this.#m();
    const r = this.#y();
    n && (this.#t !== i || le(this.options.enabled, this.#t) !== le(e.enabled, this.#t) || r !== this.#l) && this.#_(r);
  }
  getOptimisticResult(t) {
    const e = this.#e.getQueryCache().build(this.#e, t), i = this.createResult(e, t);
    return wr(this, i) && (this.#r = i, this.#o = this.options, this.#n = this.#t.state), i;
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
    return t?.throwOnError || (e = e.catch(ee)), e;
  }
  #m() {
    this.#b();
    const t = we(
      this.options.staleTime,
      this.#t
    );
    if (Pe || this.#r.isStale || !Pt(t))
      return;
    const i = an(this.#r.dataUpdatedAt, t) + 1;
    this.#c = Re.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(t) {
    this.#x(), this.#l = t, !(Pe || le(this.options.enabled, this.#t) === !1 || !Pt(this.#l) || this.#l === 0) && (this.#d = Re.setInterval(() => {
      (this.options.refetchIntervalInBackground || Zt.isFocused()) && this.#u();
    }, this.#l));
  }
  #v() {
    this.#m(), this.#_(this.#y());
  }
  #b() {
    this.#c && (Re.clearTimeout(this.#c), this.#c = void 0);
  }
  #x() {
    this.#d && (Re.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(t, e) {
    const i = this.#t, n = this.options, r = this.#r, o = this.#n, a = this.#o, c = t !== i ? t.state : this.#i, { state: h } = t;
    let u = { ...h }, d = !1, p;
    if (e._optimisticResults) {
      const R = this.hasListeners(), z = !R && Ii(t, e), j = R && Ti(t, i, e, n);
      (z || j) && (u = {
        ...u,
        ...fn(h.data, t.options)
      }), e._optimisticResults === "isRestoring" && (u.fetchStatus = "idle");
    }
    let { error: g, errorUpdatedAt: y, status: b } = u;
    p = u.data;
    let E = !1;
    if (e.placeholderData !== void 0 && p === void 0 && b === "pending") {
      let R;
      r?.isPlaceholderData && e.placeholderData === a?.placeholderData ? (R = r.data, E = !0) : R = typeof e.placeholderData == "function" ? e.placeholderData(
        this.#f?.state.data,
        this.#f
      ) : e.placeholderData, R !== void 0 && (b = "success", p = Lt(
        r?.data,
        R,
        e
      ), d = !0);
    }
    if (e.select && p !== void 0 && !E)
      if (r && p === o?.data && e.select === this.#g)
        p = this.#h;
      else
        try {
          this.#g = e.select, p = e.select(p), p = Lt(r?.data, p, e), this.#h = p, this.#s = null;
        } catch (R) {
          this.#s = R;
        }
    this.#s && (g = this.#s, p = this.#h, y = Date.now(), b = "error");
    const x = u.fetchStatus === "fetching", m = b === "pending", P = b === "error", D = m && x, M = p !== void 0, N = {
      status: b,
      fetchStatus: u.fetchStatus,
      isPending: m,
      isSuccess: b === "success",
      isError: P,
      isInitialLoading: D,
      isLoading: D,
      data: p,
      dataUpdatedAt: u.dataUpdatedAt,
      error: g,
      errorUpdatedAt: y,
      failureCount: u.fetchFailureCount,
      failureReason: u.fetchFailureReason,
      errorUpdateCount: u.errorUpdateCount,
      isFetched: u.dataUpdateCount > 0 || u.errorUpdateCount > 0,
      isFetchedAfterMount: u.dataUpdateCount > c.dataUpdateCount || u.errorUpdateCount > c.errorUpdateCount,
      isFetching: x,
      isRefetching: x && !m,
      isLoadingError: P && !M,
      isPaused: u.fetchStatus === "paused",
      isPlaceholderData: d,
      isRefetchError: P && M,
      isStale: ei(t, e),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: le(e.enabled, t) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const R = N.data !== void 0, z = N.status === "error" && !R, j = (te) => {
        z ? te.reject(N.error) : R && te.resolve(N.data);
      }, O = () => {
        const te = this.#a = N.promise = Ft();
        j(te);
      }, K = this.#a;
      switch (K.status) {
        case "pending":
          t.queryHash === i.queryHash && j(K);
          break;
        case "fulfilled":
          (z || N.data !== K.value) && O();
          break;
        case "rejected":
          (!z || N.error !== K.reason) && O();
          break;
      }
    }
    return N;
  }
  updateResult() {
    const t = this.#r, e = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#f = this.#t), ft(e, t))
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
    this.updateResult(), this.hasListeners() && this.#v();
  }
  #w(t) {
    V.batch(() => {
      t.listeners && this.listeners.forEach((e) => {
        e(this.#r);
      }), this.#e.getQueryCache().notify({
        query: this.#t,
        type: "observerResultsUpdated"
      });
    });
  }
};
function Sr(t, e) {
  return le(e.enabled, t) !== !1 && t.state.data === void 0 && !(t.state.status === "error" && e.retryOnMount === !1);
}
function Ii(t, e) {
  return Sr(t, e) || t.state.data !== void 0 && Nt(t, e, e.refetchOnMount);
}
function Nt(t, e, i) {
  if (le(e.enabled, t) !== !1 && we(e.staleTime, t) !== "static") {
    const n = typeof i == "function" ? i(t) : i;
    return n === "always" || n !== !1 && ei(t, e);
  }
  return !1;
}
function Ti(t, e, i, n) {
  return (t !== e || le(n.enabled, t) === !1) && (!i.suspense || t.state.status !== "error") && ei(t, i);
}
function ei(t, e) {
  return le(e.enabled, t) !== !1 && t.isStaleByTime(we(e.staleTime, t));
}
function wr(t, e) {
  return !ft(t.getCurrentResult(), e);
}
function ki(t) {
  return {
    onFetch: (e, i) => {
      const n = e.options, r = e.fetchOptions?.meta?.fetchMore?.direction, o = e.state.data?.pages || [], a = e.state.data?.pageParams || [];
      let l = { pages: [], pageParams: [] }, c = 0;
      const h = async () => {
        let u = !1;
        const d = (y) => {
          pr(
            y,
            () => e.signal,
            () => u = !0
          );
        }, p = cn(e.options, e.fetchOptions), g = async (y, b, E) => {
          if (u)
            return Promise.reject();
          if (b == null && y.pages.length)
            return Promise.resolve(y);
          const m = (() => {
            const H = {
              client: e.client,
              queryKey: e.queryKey,
              pageParam: b,
              direction: E ? "backward" : "forward",
              meta: e.options.meta
            };
            return d(H), H;
          })(), P = await p(m), { maxPages: D } = e.options, M = E ? fr : hr;
          return {
            pages: M(y.pages, P, D),
            pageParams: M(y.pageParams, b, D)
          };
        };
        if (r && o.length) {
          const y = r === "backward", b = y ? Er : Ri, E = {
            pages: o,
            pageParams: a
          }, x = b(n, E);
          l = await g(E, x, y);
        } else {
          const y = t ?? o.length;
          do {
            const b = c === 0 ? a[0] ?? n.initialPageParam : Ri(n, l);
            if (c > 0 && b == null)
              break;
            l = await g(l, b), c++;
          } while (c < y);
        }
        return l;
      };
      e.options.persister ? e.fetchFn = () => e.options.persister?.(
        h,
        {
          client: e.client,
          queryKey: e.queryKey,
          meta: e.options.meta,
          signal: e.signal
        },
        i
      ) : e.fetchFn = h;
    }
  };
}
function Ri(t, { pages: e, pageParams: i }) {
  const n = e.length - 1;
  return e.length > 0 ? t.getNextPageParam(
    e[n],
    e,
    i[n],
    i
  ) : void 0;
}
function Er(t, { pages: e, pageParams: i }) {
  return e.length > 0 ? t.getPreviousPageParam?.(e[0], e, i[0], i) : void 0;
}
var Cr = class extends hn {
  #e;
  #t;
  #i;
  #r;
  constructor(t) {
    super(), this.#e = t.client, this.mutationId = t.mutationId, this.#i = t.mutationCache, this.#t = [], this.state = t.state || pn(), this.setOptions(t.options), this.scheduleGc();
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
    this.#r = un({
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
    this.state = e(this.state), V.batch(() => {
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
function pn() {
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
var Ir = class extends Be {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(t, e, i) {
    const n = new Cr({
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
    const e = tt(t);
    if (typeof e == "string") {
      const i = this.#t.get(e);
      i ? i.push(t) : this.#t.set(e, [t]);
    }
    this.notify({ type: "added", mutation: t });
  }
  remove(t) {
    if (this.#e.delete(t)) {
      const e = tt(t);
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
    const e = tt(t);
    if (typeof e == "string") {
      const n = this.#t.get(e)?.find(
        (r) => r.state.status === "pending"
      );
      return !n || n === t;
    } else
      return !0;
  }
  runNext(t) {
    const e = tt(t);
    return typeof e == "string" ? this.#t.get(e)?.find((n) => n !== t && n.state.isPaused)?.continue() ?? Promise.resolve() : Promise.resolve();
  }
  clear() {
    V.batch(() => {
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
    V.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  resumePausedMutations() {
    const t = this.getAll().filter((e) => e.state.isPaused);
    return V.batch(
      () => Promise.all(
        t.map((e) => e.continue().catch(ee))
      )
    );
  }
};
function tt(t) {
  return t.options.scope?.id;
}
var Tr = class extends Be {
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
    this.options = this.#e.defaultMutationOptions(e), ft(this.options, i) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), i?.mutationKey && this.options.mutationKey && De(i.mutationKey) !== De(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
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
    const e = this.#i?.state ?? pn();
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
    V.batch(() => {
      if (this.#r && this.hasListeners()) {
        const i = this.#t.variables, n = this.#t.context, r = {
          client: this.#e,
          meta: this.options.meta,
          mutationKey: this.options.mutationKey
        };
        if (e?.type === "success") {
          try {
            this.#r.onSuccess?.(
              e.data,
              i,
              n,
              r
            );
          } catch (o) {
            Promise.reject(o);
          }
          try {
            this.#r.onSettled?.(
              e.data,
              null,
              i,
              n,
              r
            );
          } catch (o) {
            Promise.reject(o);
          }
        } else if (e?.type === "error") {
          try {
            this.#r.onError?.(
              e.error,
              i,
              n,
              r
            );
          } catch (o) {
            Promise.reject(o);
          }
          try {
            this.#r.onSettled?.(
              void 0,
              e.error,
              i,
              n,
              r
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
}, kr = class extends Be {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(t, e, i) {
    const n = e.queryKey, r = e.queryHash ?? Yt(n, e);
    let o = this.get(r);
    return o || (o = new br({
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
    V.batch(() => {
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
      (i) => bi(e, i)
    );
  }
  findAll(t = {}) {
    const e = this.getAll();
    return Object.keys(t).length > 0 ? e.filter((i) => bi(t, i)) : e;
  }
  notify(t) {
    V.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  onFocus() {
    V.batch(() => {
      this.getAll().forEach((t) => {
        t.onFocus();
      });
    });
  }
  onOnline() {
    V.batch(() => {
      this.getAll().forEach((t) => {
        t.onOnline();
      });
    });
  }
}, Rr = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  #s;
  constructor(t = {}) {
    this.#e = t.queryCache || new kr(), this.#t = t.mutationCache || new Ir(), this.#i = t.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = Zt.subscribe(async (t) => {
      t && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = pt.subscribe(async (t) => {
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
    return n === void 0 ? this.fetchQuery(t) : (t.revalidateIfStale && i.isStaleByTime(we(e.staleTime, i)) && this.prefetchQuery(e), Promise.resolve(n));
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
    )?.state.data, a = cr(e, o);
    if (a !== void 0)
      return this.#e.build(this, n).setData(a, { ...i, manual: !0 });
  }
  setQueriesData(t, e, i) {
    return V.batch(
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
    V.batch(() => {
      e.findAll(t).forEach((i) => {
        e.remove(i);
      });
    });
  }
  resetQueries(t, e) {
    const i = this.#e;
    return V.batch(() => (i.findAll(t).forEach((n) => {
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
    const i = { revert: !0, ...e }, n = V.batch(
      () => this.#e.findAll(t).map((r) => r.cancel(i))
    );
    return Promise.all(n).then(ee).catch(ee);
  }
  invalidateQueries(t, e = {}) {
    return V.batch(() => (this.#e.findAll(t).forEach((i) => {
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
    }, n = V.batch(
      () => this.#e.findAll(t).filter((r) => !r.isDisabled() && !r.isStatic()).map((r) => {
        let o = r.fetch(void 0, i);
        return i.throwOnError || (o = o.catch(ee)), r.state.fetchStatus === "paused" ? Promise.resolve() : o;
      })
    );
    return Promise.all(n).then(ee);
  }
  fetchQuery(t) {
    const e = this.defaultQueryOptions(t);
    e.retry === void 0 && (e.retry = !1);
    const i = this.#e.build(this, e);
    return i.isStaleByTime(
      we(e.staleTime, i)
    ) ? i.fetch(e) : Promise.resolve(i.state.data);
  }
  prefetchQuery(t) {
    return this.fetchQuery(t).then(ee).catch(ee);
  }
  fetchInfiniteQuery(t) {
    return t.behavior = ki(t.pages), this.fetchQuery(t);
  }
  prefetchInfiniteQuery(t) {
    return this.fetchInfiniteQuery(t).then(ee).catch(ee);
  }
  ensureInfiniteQueryData(t) {
    return t.behavior = ki(t.pages), this.ensureQueryData(t);
  }
  resumePausedMutations() {
    return pt.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
    this.#r.set(De(t), {
      queryKey: t,
      defaultOptions: e
    });
  }
  getQueryDefaults(t) {
    const e = [...this.#r.values()], i = {};
    return e.forEach((n) => {
      Ye(t, n.queryKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  setMutationDefaults(t, e) {
    this.#n.set(De(t), {
      mutationKey: t,
      defaultOptions: e
    });
  }
  getMutationDefaults(t) {
    const e = [...this.#n.values()], i = {};
    return e.forEach((n) => {
      Ye(t, n.mutationKey) && Object.assign(i, n.defaultOptions);
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
    return e.queryHash || (e.queryHash = Yt(
      e.queryKey,
      e
    )), e.refetchOnReconnect === void 0 && (e.refetchOnReconnect = e.networkMode !== "always"), e.throwOnError === void 0 && (e.throwOnError = !!e.suspense), !e.networkMode && e.persister && (e.networkMode = "offlineFirst"), e.queryFn === Xt && (e.enabled = !1), e;
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
function Or(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function Oi(t, e) {
  for (var i in t) if (i !== "__source" && !(i in e)) return !0;
  for (var n in e) if (n !== "__source" && t[n] !== e[n]) return !0;
  return !1;
}
function gn(t, e) {
  var i = e(), n = C({ t: { __: i, u: e } }), r = n[0].t, o = n[1];
  return Kn(function() {
    r.__ = i, r.u = e, bt(r) && o({ t: r });
  }, [t, i, e]), q(function() {
    return bt(r) && o({ t: r }), t(function() {
      bt(r) && o({ t: r });
    });
  }, [t]), i;
}
function bt(t) {
  var e, i, n = t.u, r = t.__;
  try {
    var o = n();
    return !((e = r) === (i = o) && (e !== 0 || 1 / e == 1 / i) || e != e && i != i);
  } catch {
    return !0;
  }
}
function Ai(t, e) {
  this.props = t, this.context = e;
}
(Ai.prototype = new me()).isPureReactComponent = !0, Ai.prototype.shouldComponentUpdate = function(t, e) {
  return Oi(this.props, t) || Oi(this.state, e);
};
var Pi = I.__b;
I.__b = function(t) {
  t.type && t.type.__f && t.ref && (t.props.ref = t.ref, t.ref = null), Pi && Pi(t);
};
var Ar = I.__e;
I.__e = function(t, e, i, n) {
  if (t.then) {
    for (var r, o = e; o = o.__; ) if ((r = o.__c) && r.__c) return e.__e == null && (e.__e = i.__e, e.__k = i.__k), r.__c(t, e);
  }
  Ar(t, e, i, n);
};
var Di = I.unmount;
function mn(t, e, i) {
  return t && (t.__c && t.__c.__H && (t.__c.__H.__.forEach(function(n) {
    typeof n.__c == "function" && n.__c();
  }), t.__c.__H = null), (t = Or({}, t)).__c != null && (t.__c.__P === i && (t.__c.__P = e), t.__c.__e = !0, t.__c = null), t.__k = t.__k && t.__k.map(function(n) {
    return mn(n, e, i);
  })), t;
}
function yn(t, e, i) {
  return t && i && (t.__v = null, t.__k = t.__k && t.__k.map(function(n) {
    return yn(n, e, i);
  }), t.__c && t.__c.__P === e && (t.__e && i.appendChild(t.__e), t.__c.__e = !0, t.__c.__P = i)), t;
}
function xt() {
  this.__u = 0, this.o = null, this.__b = null;
}
function _n(t) {
  if (!t.__) return null;
  var e = t.__.__c;
  return e && e.__a && e.__a(t);
}
function it() {
  this.i = null, this.l = null;
}
I.unmount = function(t) {
  var e = t.__c;
  e && (e.__z = !0), e && e.__R && e.__R(), e && 32 & t.__u && (t.type = null), Di && Di(t);
}, (xt.prototype = new me()).__c = function(t, e) {
  var i = e.__c, n = this;
  n.o == null && (n.o = []), n.o.push(i);
  var r = _n(n.__v), o = !1, a = function() {
    o || n.__z || (o = !0, i.__R = null, r ? r(c) : c());
  };
  i.__R = a;
  var l = i.__P;
  i.__P = null;
  var c = function() {
    if (!--n.__u) {
      if (n.state.__a) {
        var h = n.state.__a;
        n.__v.__k[0] = yn(h, h.__c.__P, h.__c.__O);
      }
      var u;
      for (n.setState({ __a: n.__b = null }); u = n.o.pop(); ) u.__P = l, u.forceUpdate();
    }
  };
  n.__u++ || 32 & e.__u || n.setState({ __a: n.__b = n.__v.__k[0] }), t.then(a, a);
}, xt.prototype.componentWillUnmount = function() {
  this.o = [];
}, xt.prototype.render = function(t, e) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), n = this.__v.__k[0].__c;
      this.__v.__k[0] = mn(this.__b, i, n.__O = n.__P);
    }
    this.__b = null;
  }
  var r = e.__a && kt(oe, null, t.fallback);
  return r && (r.__u &= -33), [kt(oe, null, e.__a ? null : t.children), r];
};
var Li = function(t, e, i) {
  if (++i[1] === i[0] && t.l.delete(e), t.props.revealOrder && (t.props.revealOrder[0] !== "t" || !t.l.size)) for (i = t.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    t.i = i = i[2];
  }
};
(it.prototype = new me()).__a = function(t) {
  var e = this, i = _n(e.__v), n = e.l.get(t);
  return n[0]++, function(r) {
    var o = function() {
      e.props.revealOrder ? (n.push(r), Li(e, t, n)) : r();
    };
    i ? i(o) : o();
  };
}, it.prototype.render = function(t) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var e = ut(t.children);
  t.revealOrder && t.revealOrder[0] === "b" && e.reverse();
  for (var i = e.length; i--; ) this.l.set(e[i], this.i = [1, 0, this.i]);
  return t.children;
}, it.prototype.componentDidUpdate = it.prototype.componentDidMount = function() {
  var t = this;
  this.l.forEach(function(e, i) {
    Li(t, i, e);
  });
};
var Pr = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, Dr = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, Lr = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, Fr = /[A-Z0-9]/g, Mr = typeof document < "u", Nr = function(t) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(t);
};
me.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t) {
  Object.defineProperty(me.prototype, t, { configurable: !0, get: function() {
    return this["UNSAFE_" + t];
  }, set: function(e) {
    Object.defineProperty(this, t, { configurable: !0, writable: !0, value: e });
  } });
});
var Fi = I.event;
function zr() {
}
function Ur() {
  return this.cancelBubble;
}
function Br() {
  return this.defaultPrevented;
}
I.event = function(t) {
  return Fi && (t = Fi(t)), t.persist = zr, t.isPropagationStopped = Ur, t.isDefaultPrevented = Br, t.nativeEvent = t;
};
var Gr = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, Mi = I.vnode;
I.vnode = function(t) {
  typeof t.type == "string" && (function(e) {
    var i = e.props, n = e.type, r = {}, o = n.indexOf("-") === -1;
    for (var a in i) {
      var l = i[a];
      if (!(a === "value" && "defaultValue" in i && l == null || Mr && a === "children" && n === "noscript" || a === "class" || a === "className")) {
        var c = a.toLowerCase();
        a === "defaultValue" && "value" in i && i.value == null ? a = "value" : a === "download" && l === !0 ? l = "" : c === "translate" && l === "no" ? l = !1 : c[0] === "o" && c[1] === "n" ? c === "ondoubleclick" ? a = "ondblclick" : c !== "onchange" || n !== "input" && n !== "textarea" || Nr(i.type) ? c === "onfocus" ? a = "onfocusin" : c === "onblur" ? a = "onfocusout" : Lr.test(a) && (a = c) : c = a = "oninput" : o && Dr.test(a) ? a = a.replace(Fr, "-$&").toLowerCase() : l === null && (l = void 0), c === "oninput" && r[a = c] && (a = "oninputCapture"), r[a] = l;
      }
    }
    n == "select" && r.multiple && Array.isArray(r.value) && (r.value = ut(i.children).forEach(function(h) {
      h.props.selected = r.value.indexOf(h.props.value) != -1;
    })), n == "select" && r.defaultValue != null && (r.value = ut(i.children).forEach(function(h) {
      h.props.selected = r.multiple ? r.defaultValue.indexOf(h.props.value) != -1 : r.defaultValue == h.props.value;
    })), i.class && !i.className ? (r.class = i.class, Object.defineProperty(r, "className", Gr)) : (i.className && !i.class || i.class && i.className) && (r.class = r.className = i.className), e.props = r;
  })(t), t.$$typeof = Pr, Mi && Mi(t);
};
var Ni = I.__r;
I.__r = function(t) {
  Ni && Ni(t), t.__c;
};
var zi = I.diffed;
I.diffed = function(t) {
  zi && zi(t);
  var e = t.props, i = t.__e;
  i != null && t.type === "textarea" && "value" in e && e.value !== i.value && (i.value = e.value == null ? "" : e.value);
};
var vn = Vt(
  void 0
), Ze = (t) => {
  const e = jt(vn);
  if (!e)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return e;
}, Hr = ({
  client: t,
  children: e
}) => (q(() => (t.mount(), () => {
  t.unmount();
}), [t]), /* @__PURE__ */ s(vn.Provider, { value: t, children: e })), bn = Vt(!1), $r = () => jt(bn);
bn.Provider;
function Wr() {
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
var Kr = Vt(Wr()), Qr = () => jt(Kr), Vr = (t, e, i) => {
  const n = i?.state.error && typeof t.throwOnError == "function" ? Jt(t.throwOnError, [i.state.error, i]) : t.throwOnError;
  (t.suspense || t.experimental_prefetchInRender || n) && (e.isReset() || (t.retryOnMount = !1));
}, jr = (t) => {
  q(() => {
    t.clearReset();
  }, [t]);
}, qr = ({
  result: t,
  errorResetBoundary: e,
  throwOnError: i,
  query: n,
  suspense: r
}) => t.isError && !e.isReset() && !t.isFetching && n && (r && t.data === void 0 || Jt(i, [t.error, n])), Yr = (t) => {
  if (t.suspense) {
    const i = (r) => r === "static" ? r : Math.max(r ?? 1e3, 1e3), n = t.staleTime;
    t.staleTime = typeof n == "function" ? (...r) => i(n(...r)) : i(n), typeof t.gcTime == "number" && (t.gcTime = Math.max(
      t.gcTime,
      1e3
    ));
  }
}, Xr = (t, e) => t.isLoading && t.isFetching && !e, Jr = (t, e) => t?.suspense && e.isPending, Ui = (t, e, i) => e.fetchOptimistic(t).catch(() => {
  i.clearReset();
});
function Zr(t, e, i) {
  const n = $r(), r = Qr(), o = Ze(), a = o.defaultQueryOptions(t);
  o.getDefaultOptions().queries?._experimental_beforeQuery?.(
    a
  );
  const l = o.getQueryCache().get(a.queryHash);
  a._optimisticResults = n ? "isRestoring" : "optimistic", Yr(a), Vr(a, r, l), jr(r);
  const c = !o.getQueryCache().get(a.queryHash), [h] = C(
    () => new e(
      o,
      a
    )
  ), u = h.getOptimisticResult(a), d = !n && t.subscribed !== !1;
  if (gn(
    ce(
      (p) => {
        const g = d ? h.subscribe(V.batchCalls(p)) : ee;
        return h.updateResult(), g;
      },
      [h, d]
    ),
    () => h.getCurrentResult()
  ), q(() => {
    h.setOptions(a);
  }, [a, h]), Jr(a, u))
    throw Ui(a, h, r);
  if (qr({
    result: u,
    errorResetBoundary: r,
    throwOnError: a.throwOnError,
    query: l,
    suspense: a.suspense
  }))
    throw u.error;
  return o.getDefaultOptions().queries?._experimental_afterQuery?.(
    a,
    u
  ), a.experimental_prefetchInRender && !Pe && Xr(u, n) && (c ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    Ui(a, h, r)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    l?.promise
  ))?.catch(ee).finally(() => {
    h.updateResult();
  }), a.notifyOnChangeProps ? u : h.trackResult(u);
}
function mt(t, e) {
  return Zr(t, xr);
}
function Le(t, e) {
  const i = Ze(), [n] = C(
    () => new Tr(
      i,
      t
    )
  );
  q(() => {
    n.setOptions(t);
  }, [n, t]);
  const r = gn(
    ce(
      (a) => n.subscribe(V.batchCalls(a)),
      [n]
    ),
    () => n.getCurrentResult()
  ), o = ce(
    (a, l) => {
      n.mutate(a, l).catch(ee);
    },
    [n]
  );
  if (r.error && Jt(n.options.throwOnError, [r.error]))
    throw r.error;
  return { ...r, mutate: o, mutateAsync: r.mutate };
}
const fe = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif", f = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "100%",
    minHeight: "100%",
    fontFamily: fe
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
    fontFamily: fe
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
    fontFamily: fe
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
    fontFamily: fe
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: fe
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
    fontFamily: fe,
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
    fontFamily: fe
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
    fontFamily: fe
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
}, es = `
* { font-family: ${fe}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function A({
  variant: t,
  children: e,
  onClick: i,
  type: n = "button",
  title: r,
  active: o = !1,
  style: a,
  class: l,
  disabled: c,
  "aria-label": h
}) {
  const u = t === "primary" ? f.primaryBtn : t === "secondary" ? f.secondaryBtn : t === "icon" ? f.iconBtn : t === "iconSm" ? f.iconBtnSm : t === "placement" ? f.placementBtn(o) : {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.25rem",
    fontFamily: fe
  }, d = a ? { ...u, ...a } : u;
  return /* @__PURE__ */ s(
    "button",
    {
      type: n,
      style: d,
      class: l,
      onClick: i,
      title: r,
      disabled: c,
      "aria-label": h,
      children: e
    }
  );
}
const ts = "https://devgw.revgain.ai/rg-pex", xn = "designerIud";
function is() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(xn);
  } catch {
    return null;
  }
}
function nt(t) {
  const e = {
    "Content-Type": "application/json",
    schema: "customer_1001",
    ...t
  }, i = is();
  return i && (e.iud = i), e;
}
const ne = {
  baseUrl: ts,
  async get(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, n = await fetch(i, {
      ...e,
      headers: { ...nt(), ...e?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  },
  async post(t, e, i) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "POST",
      ...i,
      headers: { ...nt(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async put(t, e, i) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "PUT",
      ...i,
      headers: { ...nt(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async delete(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, n = await fetch(i, {
      method: "DELETE",
      ...e,
      headers: { ...nt(), ...e?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  }
}, Sn = (t) => ["guides", "byId", t];
async function ns(t) {
  const e = new URLSearchParams({ guide_id: t });
  return ne.get(`/guides?${e.toString()}`);
}
function rs(t) {
  return mt({
    queryKey: Sn(t),
    queryFn: () => ns(t),
    enabled: !!t,
    retry: 0
  });
}
const ss = ["guides", "update"];
async function os({
  guideId: t,
  payload: e
}) {
  return ne.put(`/guides/${t}`, e);
}
function as() {
  const t = Ze();
  return Le({
    mutationKey: ss,
    mutationFn: os,
    onSuccess: (e, i) => {
      t.invalidateQueries({ queryKey: Sn(i.guideId) });
    }
  });
}
const zt = "Template", Ut = "Description", Bt = "Next";
function ls(t) {
  try {
    const e = JSON.parse(t || "{}");
    return {
      title: e.title ?? zt,
      description: e.description ?? Ut,
      buttonContent: e.buttonContent ?? Bt
    };
  } catch {
    return {
      title: zt,
      description: Ut,
      buttonContent: Bt
    };
  }
}
function cs(t) {
  return t?.template_key ?? "";
}
const wn = {
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
function En({
  title: t = zt,
  description: e = Ut,
  buttonContent: i = Bt
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
function ds(t) {
  return /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", margin: "0 auto" }, children: /* @__PURE__ */ s("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 8, ...wn }, children: [
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
    /* @__PURE__ */ s(En, { ...t })
  ] }) });
}
function us(t) {
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
    /* @__PURE__ */ s("div", { style: { position: "relative", marginTop: 0, display: "flex", flexDirection: "column", gap: 8, ...wn }, children: [
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
      /* @__PURE__ */ s(En, { ...t })
    ] })
  ] });
}
function hs({
  item: t,
  selected: e = !1,
  onClick: i,
  disabled: n = !1
}) {
  const r = t.template, o = Ee(() => cs(r), [r]), a = Ee(() => ls(r.content), [r.content]);
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
          o === "tooltip-scratch" ? us : ds,
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
function fs({
  onMessage: t,
  elementSelected: e,
  guideId: i = null,
  templateId: n = null
}) {
  const [r, o] = C(""), [a, l] = C(void 0), [c, h] = C(null), [u, d] = C(""), [p, g] = C(null), [y, b] = C(!1), [E, x] = C("on_click"), [m, P] = C(null), [D, M] = C(!1), [H, N] = C(!1), [R, z] = C("anchored"), [j, O] = C("center"), { data: K, isLoading: te } = rs(i), T = K?.data, Q = Ee(() => T ? T.templates && T.templates.length > 0 ? T.templates : T.steps || [] : [], [T]), de = as(), X = Ee(() => p ? Q.find((w) => w.map_id === p) : null, [p, Q]);
  q(() => {
    if (Q.length > 0)
      if (n) {
        const w = Q.find((U) => U.template_id === n);
        w && g(w.map_id);
      } else p || g(Q[0].map_id);
  }, [Q, n]), q(() => {
    T && x(T.target_segment ? "on_click" : "automatic");
  }, [T]), q(() => {
    if (X) {
      N(X.auto_click_target ?? !1), z(X.x_path ? "anchored" : "floating");
      try {
        const w = JSON.parse(X.template.content || "{}");
        w.layout?.position ? O(w.layout.position) : O("center");
      } catch {
        O("center");
      }
    } else
      N(!1), O("center"), z("floating");
  }, [X, i]), q(() => {
    t({ type: "EDITOR_READY" });
  }, []), q(() => {
    e ? y ? P({
      selector: e.selector,
      xpath: e.xpath,
      elementInfo: e.elementInfo
    }) : (o(e.selector), l(e.xpath), h(e.elementInfo), d("")) : y && P(null);
  }, [e, y]);
  const Ce = () => {
    M(!1), o(""), l(void 0), h(null), d(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, ue = () => {
    M(!1), o(""), l(void 0), h(null), d(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, ae = (w, U) => {
    try {
      const J = JSON.parse(w || "{}");
      return U && (J.layout || (J.layout = {}), J.layout.position = j), JSON.stringify(J);
    } catch {
      return U ? JSON.stringify({ body: w, layout: { position: j } }) : w;
    }
  }, _e = async () => {
    if (!T || !i) return;
    const w = ze();
    a ?? (r && (r.startsWith("/") || r.startsWith("//")));
    const U = Q.slice().sort((W, F) => W.step_order - F.step_order).map((W) => {
      const F = W.map_id === p;
      let G = W.x_path;
      F && (G = R === "floating" ? null : a || r || W.x_path);
      const re = !G;
      return {
        template_id: W.template_id,
        step_order: W.step_order,
        url: F ? w : W.url ?? w,
        x_path: G,
        auto_click_target: F ? H : W.auto_click_target ?? !1,
        content: F ? ae(W.template?.content || "", re) : W.template?.content || ""
      };
    }), J = {
      guide_name: T.guide_name ?? "",
      description: T.description ?? "",
      target_segment: T.target_segment ?? null,
      guide_category: T.guide_category ?? null,
      target_page: T.target_page ?? w,
      type: T.type ?? "modal",
      trigger_type: E === "automatic" ? "page_load" : "click",
      status: T.status ?? "draft",
      priority: T.priority ?? 0,
      templates: U
    };
    d("");
    try {
      await de.mutateAsync({ guideId: i, payload: J }), ue();
    } catch (W) {
      const F = W instanceof Error ? W.message : "Failed to update guide";
      d(F);
    }
  }, Fe = async () => {
    if (!T || !i) return;
    const w = ze(), U = E === "automatic" ? null : m?.xpath ?? (m?.selector?.startsWith("/") || m?.selector?.startsWith("//") ? m?.selector : null) ?? null, J = Q.slice().sort((F, G) => F.step_order - G.step_order).map((F) => {
      const G = F.map_id === p;
      let re = F.x_path;
      G && (re = R === "floating" ? null : a || r || F.x_path);
      const k = !re;
      return {
        template_id: F.template_id,
        step_order: F.step_order,
        url: G ? w : F.url ?? w,
        x_path: re,
        auto_click_target: G ? H : F.auto_click_target ?? !1,
        content: G ? ae(F.template?.content || "", k) : F.template?.content || ""
      };
    }), W = {
      guide_name: T.guide_name ?? "",
      description: T.description ?? "",
      target_segment: U,
      guide_category: T.guide_category ?? null,
      target_page: w,
      type: T.type ?? "modal",
      trigger_type: E === "automatic" ? "page_load" : "click",
      status: T.status ?? "draft",
      priority: T.priority ?? 0,
      templates: J
    };
    d("");
    try {
      await de.mutateAsync({ guideId: i, payload: W }), ue();
    } catch (F) {
      const G = F instanceof Error ? F.message : "Failed to update guide";
      d(G);
    }
  }, Me = (w) => {
    const U = [];
    return w.tagName && U.push(`Tag: ${w.tagName}`), w.id && U.push(`ID: ${w.id}`), w.className && U.push(`Class: ${w.className}`), w.textContent && U.push(`Text: ${w.textContent}`), U.join(" | ");
  }, he = !!i && !!T;
  return /* @__PURE__ */ s("div", { style: f.root, children: [
    /* @__PURE__ */ s("div", { style: f.header, children: [
      /* @__PURE__ */ s("h2", { style: f.headerTitle, children: he ? T?.guide_name ?? "Guide" : "Create Guide" }),
      /* @__PURE__ */ s(A, { variant: "icon", onClick: () => t({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    y ? /* @__PURE__ */ s("div", { style: { ...f.section, paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ s(
        A,
        {
          variant: "secondary",
          style: { alignSelf: "flex-start" },
          onClick: () => {
            M(!1), b(!1), P(null), t({ type: "CLEAR_SELECTION_CLICKED" });
          },
          children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left", style: { marginRight: "0.5rem" } }),
            "Back"
          ]
        }
      ),
      T?.target_segment && /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Current target segment" }),
        /* @__PURE__ */ s("div", { style: { ...f.selectorBox, marginTop: "0.5rem" }, title: T.target_segment, children: T.target_segment.length > 60 ? T.target_segment.slice(0, 60) + "…" : T.target_segment })
      ] }),
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Action" }),
        /* @__PURE__ */ s(
          "select",
          {
            value: E,
            onChange: (w) => x(w.target.value),
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
      E === "on_click" && /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("label", { style: f.label, children: "Trigger Element" }),
        m ? /* @__PURE__ */ s(oe, { children: [
          /* @__PURE__ */ s("div", { style: { ...f.selectorBox, marginTop: "0.5rem" }, title: m.xpath ?? m.selector, children: (m.xpath ?? m.selector) || "-" }),
          m.elementInfo && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: [
            /* @__PURE__ */ s("strong", { style: f.elementInfoTitle, children: "Element Info" }),
            /* @__PURE__ */ s("div", { style: f.elementInfoText, children: Me(m.elementInfo) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
            /* @__PURE__ */ s(
              A,
              {
                variant: D ? "primary" : "secondary",
                style: { flex: 1 },
                onClick: () => {
                  M(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: "Re-Select"
              }
            ),
            /* @__PURE__ */ s(
              A,
              {
                variant: "secondary",
                style: D ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                onClick: () => {
                  M(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Hide Selector"
              }
            ),
            T?.target_segment && /* @__PURE__ */ s(
              A,
              {
                variant: "secondary",
                style: { flex: 1, borderColor: "#ef4444", color: "#dc2626" },
                onClick: () => {
                  M(!1), P(null), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: [
                  /* @__PURE__ */ s("iconify-icon", { icon: "mdi:undo", style: { marginRight: "0.25rem" } }),
                  "Clear Trigger"
                ]
              }
            )
          ] })
        ] }) : /* @__PURE__ */ s(
          A,
          {
            variant: D ? "primary" : "secondary",
            style: { marginTop: "0.5rem" },
            onClick: () => {
              M(!0), t({ type: "ACTIVATE_SELECTOR" });
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:selection-marker" }),
              "Select element"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ s(
        A,
        {
          variant: "primary",
          style: { flex: 1 },
          onClick: Fe,
          disabled: de.isPending,
          children: de.isPending ? "Updating…" : "Update Action"
        }
      ) }),
      u && /* @__PURE__ */ s("div", { style: f.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        u
      ] })
    ] }) : /* @__PURE__ */ s(oe, { children: i && te ? /* @__PURE__ */ s("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "2rem", color: "#3b82f6" } }),
      /* @__PURE__ */ s("p", { style: f.emptyStateText, children: "Loading guide…" })
    ] }) : i && !T ? /* @__PURE__ */ s("div", { style: { ...f.emptyState, padding: "2rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle", style: { fontSize: "2rem", color: "#94a3b8" } }),
      /* @__PURE__ */ s("p", { style: f.emptyStateText, children: "Guide not found." })
    ] }) : he && Q.length > 0 ? /* @__PURE__ */ s(oe, { children: [
      /* @__PURE__ */ s("div", { style: f.section, children: [
        /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: /* @__PURE__ */ s("label", { style: f.label, children: "Templates" }) }),
        /* @__PURE__ */ s(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "1rem"
            },
            children: Q.slice().sort((w, U) => w.step_order - U.step_order).map((w) => /* @__PURE__ */ s(
              hs,
              {
                item: w,
                selected: p === w.map_id,
                onClick: () => g(w.map_id)
              },
              w.map_id
            ))
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: f.section, children: /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("label", { style: f.label, children: "Layout Style" }),
          /* @__PURE__ */ s(
            "select",
            {
              value: R,
              onChange: (w) => {
                const U = w.target.value;
                z(U), U === "floating" ? Ce() : !a && !r && !X?.x_path && (M(!0), t({ type: "ACTIVATE_SELECTOR" }));
              },
              style: {
                width: "100%",
                marginTop: "0.5rem",
                padding: "0.625rem 1rem",
                fontFamily: f.root.fontFamily,
                fontSize: "0.875rem",
                borderRadius: "0.75rem",
                border: "1px solid #e2e8f0",
                background: "#fff"
              },
              children: [
                /* @__PURE__ */ s("option", { value: "anchored", children: "Anchored to Element (Tooltip)" }),
                /* @__PURE__ */ s("option", { value: "floating", children: "Floating on Page (Modal)" })
              ]
            }
          )
        ] }),
        R === "anchored" ? (
          /* Anchored UI */
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.label, children: "Target Element" }),
            /* @__PURE__ */ s("div", { style: f.selectorBox, title: a || r || X?.x_path || "", children: (a || r || X?.x_path || "").length > 60 ? (a || r || X?.x_path || "").slice(0, 60) + "…" : a || r || X?.x_path || "" }),
            c && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: [
              /* @__PURE__ */ s("strong", { style: f.elementInfoTitle, children: "Element Info" }),
              /* @__PURE__ */ s("div", { style: f.elementInfoText, children: Me(c) })
            ] }),
            /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
              /* @__PURE__ */ s(
                "input",
                {
                  type: "checkbox",
                  id: "autoClickTargetStep",
                  checked: H,
                  onChange: (w) => N(w.target.checked),
                  style: { cursor: "pointer" }
                }
              ),
              /* @__PURE__ */ s("label", { htmlFor: "autoClickTargetStep", style: { ...f.label, marginTop: 0, cursor: "pointer", fontSize: "0.8rem" }, children: "Auto-click element on Next" })
            ] }),
            /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "0.5rem" }, children: [
              /* @__PURE__ */ s(
                A,
                {
                  variant: D ? "primary" : "secondary",
                  style: { flex: 1 },
                  onClick: () => {
                    M(!0), t({ type: "ACTIVATE_SELECTOR" });
                  },
                  children: "Re-Select"
                }
              ),
              /* @__PURE__ */ s(
                A,
                {
                  variant: "secondary",
                  style: D ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
                  onClick: () => {
                    M(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                  },
                  children: "Hide"
                }
              )
            ] })
          ] })
        ) : (
          /* Floating UI */
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.label, children: "Modal Position" }),
            /* @__PURE__ */ s(
              "select",
              {
                value: j,
                onChange: (w) => O(w.target.value),
                style: {
                  width: "100%",
                  padding: "0.625rem 1rem",
                  fontFamily: f.root.fontFamily,
                  fontSize: "0.875rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  background: "#fff"
                },
                children: [
                  /* @__PURE__ */ s("option", { value: "center", children: "Center (Default)" }),
                  /* @__PURE__ */ s("option", { value: "top", children: "Top Center" }),
                  /* @__PURE__ */ s("option", { value: "bottom", children: "Bottom Center" }),
                  /* @__PURE__ */ s("option", { value: "top-left", children: "Top Left" }),
                  /* @__PURE__ */ s("option", { value: "top-right", children: "Top Right" }),
                  /* @__PURE__ */ s("option", { value: "bottom-left", children: "Bottom Left" }),
                  /* @__PURE__ */ s("option", { value: "bottom-right", children: "Bottom Right" })
                ]
              }
            ),
            /* @__PURE__ */ s("p", { style: { fontSize: "0.75rem", color: "#64748b", margin: 0 }, children: "Choose where the modal should appear on the screen." })
          ] })
        ),
        /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "0.5rem", borderTop: "none", paddingTop: 0 }, children: /* @__PURE__ */ s(
          A,
          {
            variant: "primary",
            style: { flex: 1, height: "44px" },
            onClick: _e,
            disabled: de.isPending,
            children: de.isPending ? "Saving…" : "Update Step"
          }
        ) })
      ] }) }),
      /* @__PURE__ */ s("div", { style: { ...f.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ s(A, { variant: "primary", onClick: () => b(!0), children: "Next" }) }),
      he && u && /* @__PURE__ */ s("div", { style: f.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        u
      ] })
    ] }) : null })
  ] });
}
function Ke({
  type: t = "text",
  value: e,
  onInput: i,
  placeholder: n,
  id: r,
  style: o,
  disabled: a,
  "aria-label": l
}) {
  const c = o ? { ...f.input, ...o } : f.input;
  return /* @__PURE__ */ s(
    "input",
    {
      type: t,
      value: e,
      onInput: i,
      placeholder: n,
      id: r,
      style: c,
      disabled: a,
      "aria-label": l
    }
  );
}
function Cn({
  value: t,
  onInput: e,
  placeholder: i,
  id: n,
  minHeight: r,
  style: o,
  disabled: a,
  "aria-label": l
}) {
  const c = o ? { ...f.textarea, ...o, ...r != null && { minHeight: typeof r == "number" ? `${r}px` : r } } : r != null ? { ...f.textarea, minHeight: typeof r == "number" ? `${r}px` : r } : f.textarea;
  return /* @__PURE__ */ s(
    "textarea",
    {
      value: t,
      onInput: e,
      placeholder: i,
      id: n,
      style: c,
      disabled: a,
      "aria-label": l
    }
  );
}
const ps = ["pages", "create"];
async function gs(t) {
  return ne.post("/pages", {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: "active"
  });
}
function ms() {
  return Le({
    mutationKey: ps,
    mutationFn: gs
  });
}
const ys = ["pages", "update"];
async function _s({ pageId: t, payload: e }) {
  return ne.put(`/pages/${t}`, {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: e.status ?? "active"
  });
}
function vs() {
  return Le({
    mutationKey: ys,
    mutationFn: _s
  });
}
const bs = ["pages", "delete"];
async function xs(t) {
  return ne.delete(`/pages/${t}`);
}
function Ss() {
  return Le({
    mutationKey: bs,
    mutationFn: xs
  });
}
const ws = (t) => ["pages", "check-slug", t];
async function Es(t) {
  return ne.get(`/pages/check-slug?slug=${encodeURIComponent(t)}`);
}
function Cs(t) {
  return mt({
    queryKey: ws(t),
    queryFn: () => Es(t),
    enabled: !!t,
    retry: 0
  });
}
const Is = ["pages", "list"];
async function Ts() {
  return ne.get("/pages");
}
function ks() {
  return mt({
    queryKey: Is,
    queryFn: Ts,
    retry: 0
  });
}
const Rs = "designerTaggedPages", rt = ["pages", "check-slug"], St = ["pages", "list"];
function st() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (e.host || e.hostname || "") + (e.pathname || "/") + (e.search || "") + (e.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function ot() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (e.pathname || "/").replace(/^\//, ""), n = e.search || "", r = e.hash || "";
    return "//*/" + i + n + r;
  } catch {
    return "//*/";
  }
}
function Os({ onMessage: t }) {
  const [e, i] = C("overviewUntagged"), [n, r] = C(""), [o, a] = C(""), [l, c] = C(""), [h, u] = C(!1), [d, p] = C("create"), [g, y] = C(""), [b, E] = C(""), [x, m] = C("suggested"), [P, D] = C(""), [M, H] = C(!1), [N, R] = C(null), [z, j] = C(!1), O = Ze(), K = ms(), te = vs(), T = Ss(), { data: Q, isLoading: de, isError: X } = Cs(n), { data: Ce, isLoading: ue } = ks(), ae = !!n && de, _e = K.isPending || te.isPending, Fe = (n || "").trim().toLowerCase(), he = (Ce?.data ?? []).filter((k) => (k.slug || "").trim().toLowerCase() === Fe).filter(
    (k) => (k.name || "").toLowerCase().includes(l.toLowerCase().trim())
  ), w = ce(() => {
    i("overviewUntagged"), a(st() || "(current page)"), u(!1), O.invalidateQueries({ queryKey: rt });
  }, [O]), U = ce(() => {
    i("taggedPagesDetailView"), c("");
  }, []), J = ce(() => {
    R(null), i("tagPageFormView"), u(!0), D(ot()), y(""), E(""), p("create"), m("suggested"), H(!1);
  }, []), W = ce((k) => {
    R(k.page_id), i("tagPageFormView"), u(!0), D(k.slug || ot()), y(k.name || ""), E(k.description || ""), p("create"), m("suggested"), H(!1);
  }, []);
  q(() => {
    t({ type: "EDITOR_READY" });
  }, []), q(() => {
    r(ot()), a(st() || "(current page)");
  }, []), q(() => {
    if (!n) {
      i("overviewUntagged");
      return;
    }
    if (X) {
      (e === "overviewTagged" || e === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    Q !== void 0 && (e === "overviewTagged" || e === "overviewUntagged") && i(Q.exists ? "overviewTagged" : "overviewUntagged");
  }, [n, Q, X, e]), q(() => {
    let k = st();
    const ve = () => {
      const xe = st();
      xe !== k && (k = xe, r(ot()), a(xe || "(current page)"), i("overviewUntagged"));
    }, be = () => ve(), Ne = () => ve();
    window.addEventListener("hashchange", be), window.addEventListener("popstate", Ne);
    const Ge = setInterval(ve, 1500);
    return () => {
      window.removeEventListener("hashchange", be), window.removeEventListener("popstate", Ne), clearInterval(Ge);
    };
  }, []);
  const F = async () => {
    const k = g.trim();
    if (!k) {
      H(!0);
      return;
    }
    H(!1);
    const ve = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, be = P.trim() || ve || "/";
    try {
      if (N)
        await te.mutateAsync({
          pageId: N,
          payload: {
            name: k,
            slug: be,
            description: b.trim() || void 0,
            status: "active"
          }
        }), R(null), O.invalidateQueries({ queryKey: rt }), O.invalidateQueries({ queryKey: St }), w();
      else {
        const Ne = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, Ge = P.trim() || Ne;
        await K.mutateAsync({
          name: k,
          slug: be,
          description: b.trim() || void 0
        });
        const xe = Rs, yt = localStorage.getItem(xe) || "[]", S = JSON.parse(yt);
        S.push({ pageName: k, url: Ge }), localStorage.setItem(xe, JSON.stringify(S)), O.invalidateQueries({ queryKey: rt }), O.invalidateQueries({ queryKey: St }), i("overviewTagged"), u(!1);
      }
    } catch {
    }
  }, G = async (k) => {
    if (window.confirm("Delete this page?"))
      try {
        await T.mutateAsync(k), O.invalidateQueries({ queryKey: rt }), O.invalidateQueries({ queryKey: St });
      } catch {
      }
  }, re = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return z ? /* @__PURE__ */ s("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(A, { variant: "icon", title: "Expand", onClick: () => j(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: f.panel, children: [
    /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(A, { variant: "icon", title: "Minimize", onClick: () => j(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: f.panelBody, children: [
      ae && (e === "overviewTagged" || e === "overviewUntagged") && /* @__PURE__ */ s("div", { style: { ...re, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Checking page…" })
      ] }),
      !ae && e === "overviewTagged" && /* @__PURE__ */ s("div", { style: re, children: [
        /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "1rem", cursor: "pointer" }, onClick: U, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ s("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: o })
            ] })
          ] }),
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ s(A, { variant: "primary", style: { width: "100%" }, onClick: J, children: "Tag Page" })
      ] }),
      e === "taggedPagesDetailView" && /* @__PURE__ */ s("div", { style: re, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (k) => {
              k.preventDefault(), w();
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: ue ? "…" : he.length }),
          /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ s("div", { style: f.searchWrap, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
          /* @__PURE__ */ s(
            Ke,
            {
              type: "text",
              placeholder: "Search Pages",
              value: l,
              onInput: (k) => c(k.target.value),
              style: f.searchInput
            }
          ),
          l && /* @__PURE__ */ s(A, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => c(""), children: "Clear" })
        ] }),
        ue ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ s("span", { children: "Loading pages…" })
        ] }) : he.map((k) => /* @__PURE__ */ s("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: k.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ s(A, { variant: "iconSm", title: "Edit", onClick: () => W(k), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ s(A, { variant: "iconSm", title: "Delete", onClick: () => G(k.page_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, k.page_id)),
        /* @__PURE__ */ s(A, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: J, children: "Tag Page" })
      ] }),
      !ae && e === "overviewUntagged" && /* @__PURE__ */ s("div", { style: { ...re, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ s("div", { style: { ...f.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ s(A, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: J, children: "Tag Page" })
      ] }),
      e === "tagPageFormView" && /* @__PURE__ */ s("div", { style: { ...re, gap: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (k) => {
              k.preventDefault(), R(null), w(), u(!1);
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
                Ke,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: g,
                  onInput: (k) => y(k.target.value)
                }
              ),
              M && /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ s(
                Cn,
                {
                  placeholder: "Click to add description",
                  value: b,
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
            /* @__PURE__ */ s(A, { variant: "iconSm", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "suggested", checked: x === "suggested", onChange: () => m("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "exact", checked: x === "exact", onChange: () => m("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "builder", checked: x === "builder", onChange: () => m("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ s(Ke, { type: "text", placeholder: "e.g. //*/path/to/page", value: P, onInput: (k) => D(k.target.value) })
          ] })
        ] })
      ] })
    ] }),
    h && /* @__PURE__ */ s("div", { style: f.footer, children: [
      /* @__PURE__ */ s(
        A,
        {
          variant: "secondary",
          onClick: () => {
            R(null), w();
          },
          disabled: _e,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ s(A, { variant: "primary", style: { flex: 1 }, onClick: F, disabled: _e, children: _e ? /* @__PURE__ */ s(oe, { children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        N ? "Updating…" : "Saving…"
      ] }) : N ? "Update" : "Save" })
    ] })
  ] });
}
const As = ["features", "create"];
async function Ps(t) {
  return ne.post("/features", t);
}
function Ds() {
  return Le({
    mutationKey: As,
    mutationFn: Ps
  });
}
const Ls = ["features", "update"];
async function Fs({
  featureId: t,
  payload: e
}) {
  return ne.put(`/features/${t}`, e);
}
function Ms() {
  return Le({
    mutationKey: Ls,
    mutationFn: Fs
  });
}
const Ns = ["features", "delete"];
async function zs(t) {
  return ne.delete(`/features/${t}`);
}
function Us() {
  return Le({
    mutationKey: Ns,
    mutationFn: zs
  });
}
const We = ["features", "list"];
async function Bs() {
  const t = await ne.get("/features");
  return Array.isArray(t) ? { data: t } : t;
}
function Gs() {
  return mt({
    queryKey: We,
    queryFn: Bs,
    retry: 0
  });
}
const Bi = "designerHeatmapEnabled";
function Hs({ onMessage: t, elementSelected: e }) {
  const [i, n] = C("overview"), [r, o] = C(!1), [a, l] = C(""), [c, h] = C(null), [u, d] = C(""), [p, g] = C(!1), [y, b] = C(!1), [E, x] = C(!1), [m, P] = C(!1), [D, M] = C(!1), [H, N] = C("create"), [R, z] = C("suggested"), [j, O] = C(""), [K, te] = C(""), [T, Q] = C(null), [de, X] = C(null), [Ce, ue] = C(""), ae = Ze(), _e = Ds(), Fe = Ms(), Me = Us(), { data: he, isLoading: w } = Gs(), U = _e.isPending || Fe.isPending || Me.isPending, J = he?.data ?? [], W = J.length, F = J.filter((S) => (S.name || "").toLowerCase().includes(Ce.toLowerCase().trim())).sort((S, ie) => (S.name || "").localeCompare(ie.name || "", void 0, { sensitivity: "base" })), G = ce(() => {
    n("overview"), o(!1), l(""), h(null), te(""), d(""), g(!1), Q(null), ue(""), ae.invalidateQueries({ queryKey: We });
  }, [ae]), re = ce(() => {
    n("taggedList"), ue("");
  }, []), k = ce((S) => S.rules?.find(
    (Se) => Se.selector_type === "xpath" && (Se.selector_value ?? "").trim() !== ""
  )?.selector_value ?? "", []), ve = ce(
    (S) => {
      n("form"), o(!0), S ? (Q(S.feature_id), d(S.name || ""), O(S.description || ""), te(k(S)), z("exact")) : (Q(null), d(""), O(""), te(e?.xpath || ""), l(e?.selector || ""), h(e?.elementInfo || null)), g(!1);
    },
    [e, k]
  );
  q(() => {
    t({ type: "EDITOR_READY" });
  }, []), q(() => {
    t({ type: "FEATURES_FOR_HEATMAP", features: he?.data ?? [] });
  }, [he, t]), q(() => {
    const S = localStorage.getItem(Bi) === "true";
    b(S);
  }, []), q(() => {
    e ? (l(e.selector), h(e.elementInfo), te(e.xpath || ""), o(!0), n("form"), d(""), g(!1), N("create"), O(""), z("exact")) : G();
  }, [e]);
  const be = () => {
    const S = !y;
    b(S);
    try {
      localStorage.setItem(Bi, String(S));
    } catch {
    }
    t({ type: "HEATMAP_TOGGLE", enabled: S });
  }, Ne = (S) => S.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""), Ge = async () => {
    const S = u.trim();
    if (!S) {
      g(!0);
      return;
    }
    g(!1);
    const ie = K || e?.xpath || "";
    if (R === "exact") {
      if (!ie) return;
      const Se = {
        name: S,
        slug: Ne(S),
        description: j.trim() || "",
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
        T ? (await Fe.mutateAsync({ featureId: T, payload: Se }), ae.invalidateQueries({ queryKey: We }), G()) : (await _e.mutateAsync(Se), ae.invalidateQueries({ queryKey: We }), G());
      } catch {
      }
      return;
    }
  }, xe = async (S) => {
    if (window.confirm("Delete this feature?")) {
      X(S);
      try {
        await Me.mutateAsync(S), ae.invalidateQueries({ queryKey: We }), T === S && (Q(null), G());
      } catch {
      } finally {
        X(null);
      }
    }
  }, yt = (S) => {
    const ie = [];
    S.tagName && ie.push(`Tag: ${S.tagName}`), S.id && ie.push(`ID: ${S.id}`), S.className && ie.push(`Class: ${S.className}`);
    const Se = (S.textContent || "").slice(0, 80);
    return Se && ie.push(`Text: ${Se}`), ie.join(" | ");
  };
  return E ? /* @__PURE__ */ s("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: r ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(A, { variant: "icon", title: "Expand", onClick: () => x(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: f.panel, children: [
    /* @__PURE__ */ s("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(A, { variant: "icon", title: "Minimize", onClick: () => x(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: r ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ s("a", { href: "#", style: f.link, onClick: (S) => {
          S.preventDefault(), G();
        }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: f.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: H === "create", onChange: () => N("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: H === "merge", onChange: () => N("merge"), style: { accentColor: "#3b82f6" } }),
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
                Ke,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: u,
                  onInput: (S) => d(S.target.value)
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
                Cn,
                {
                  placeholder: "Describe your Feature",
                  value: j,
                  onInput: (S) => O(S.target.value),
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
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: R === "suggested", onChange: () => z("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: R === "ruleBuilder", onChange: () => z("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: R === "customCss", onChange: () => z("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ s("label", { style: f.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: R === "exact", onChange: () => z("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: R === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ s("div", { style: f.selectorBox, children: R === "exact" ? (e?.xpath ?? K) || "-" : (e?.selector ?? a) || "-" })
          ] }),
          c && /* @__PURE__ */ s("div", { style: { marginTop: "1rem" }, children: [
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
                onClick: () => M((S) => !S),
                "aria-expanded": D,
                children: [
                  /* @__PURE__ */ s("label", { style: { ...f.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                  /* @__PURE__ */ s(
                    "iconify-icon",
                    {
                      icon: D ? "mdi:chevron-up" : "mdi:chevron-down",
                      style: { fontSize: "1.125rem", color: "#64748b", flexShrink: 0 }
                    }
                  )
                ]
              }
            ),
            D && /* @__PURE__ */ s("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: f.elementInfoText, children: yt(c) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ s("div", { style: f.footer, children: [
        /* @__PURE__ */ s(A, { variant: "secondary", onClick: G, children: "Cancel" }),
        /* @__PURE__ */ s(A, { variant: "primary", style: { flex: 1 }, onClick: Ge, disabled: U, children: U ? "Saving..." : "Save" })
      ] })
    ] }) : /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i === "taggedList" ? /* @__PURE__ */ s(oe, { children: [
      /* @__PURE__ */ s(
        "a",
        {
          href: "#",
          style: f.link,
          onClick: (S) => {
            S.preventDefault(), G();
          },
          children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
            " Back to overview"
          ]
        }
      ),
      /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: w ? "…" : F.length }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Tagged Features" })
      ] }),
      /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged features" }),
      /* @__PURE__ */ s("div", { style: f.searchWrap, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
        /* @__PURE__ */ s(
          Ke,
          {
            type: "text",
            placeholder: "Search features",
            value: Ce,
            onInput: (S) => ue(S.target.value),
            style: f.searchInput
          }
        ),
        Ce && /* @__PURE__ */ s(A, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => ue(""), children: "Clear" })
      ] }),
      w ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Loading features…" })
      ] }) : F.map((S) => {
        const ie = de === S.feature_id;
        return /* @__PURE__ */ s("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: S.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem", alignItems: "center" }, children: [
            /* @__PURE__ */ s(A, { variant: "iconSm", title: "Edit", onClick: () => ve(S), disabled: ie, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            ie ? /* @__PURE__ */ s("span", { style: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", color: "#64748b" } }) }) : /* @__PURE__ */ s(A, { variant: "iconSm", title: "Delete", onClick: () => xe(S.feature_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, S.feature_id);
      }),
      /* @__PURE__ */ s(A, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: () => ve(), children: "Tag Feature" })
    ] }) : w ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.75rem" } }),
      /* @__PURE__ */ s("span", { children: "Loading features…" })
    ] }) : /* @__PURE__ */ s(oe, { children: [
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
      /* @__PURE__ */ s("div", { style: { ...f.card, marginBottom: "0.75rem", cursor: "pointer" }, onClick: re, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: W }),
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
              onClick: be,
              onKeyDown: (S) => S.key === "Enter" && be(),
              children: /* @__PURE__ */ s("span", { style: f.toggleThumb(y) })
            }
          ),
          /* @__PURE__ */ s(A, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          A,
          {
            variant: m ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              P(!0), t({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Re-Select"
          }
        ),
        /* @__PURE__ */ s(
          A,
          {
            variant: "secondary",
            style: m ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Hide Selector"
          }
        )
      ] })
    ] }) }) })
  ] });
}
const $s = new Rr({
  defaultOptions: { mutations: { retry: 0 } }
});
class Ws {
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
      z-index: ${_.zIndex.editor};
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
    const n = (o) => this.messageCallback?.(o), r = this.mode === "tag-page" ? /* @__PURE__ */ s(Os, { onMessage: n }) : this.mode === "tag-feature" ? /* @__PURE__ */ s(
      Hs,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    ) : /* @__PURE__ */ s(
      fs,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState,
        guideId: this.guideId,
        templateId: this.templateId
      }
    );
    Oe(
      /* @__PURE__ */ s(Hr, { client: $s, children: r }),
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
  <style>${es}</style>
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
      z-index: ${_.zIndex.controls};
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
      const h = Math.abs(e.clientX - this.mouseDownX), u = Math.abs(e.clientY - this.mouseDownY);
      if (Math.sqrt(h * h + u * u) > this.dragThreshold)
        this.isDragging = !0, document.body.style.cursor = "grabbing", document.documentElement.style.cursor = "grabbing", document.body.style.userSelect = "none", document.documentElement.style.userSelect = "none", this.iframe && (this.iframe.style.pointerEvents = "none"), this.gripButton && (this.gripButton.style.cursor = "grabbing");
      else
        return;
    }
    e.preventDefault(), e.stopPropagation();
    const i = e.clientX - this.dragStartX, n = e.clientY - this.dragStartY, r = window.innerWidth, o = window.innerHeight, a = this.iframe.offsetWidth, l = Math.max(-a + 50, Math.min(i, r - 50)), c = Math.max(0, Math.min(n, o - 100));
    this.iframe.style.left = `${l}px`, this.iframe.style.top = `${c}px`, this.iframe.style.right = "auto", this.iframe.style.bottom = "auto", this.dragHandle.style.left = `${l}px`, this.dragHandle.style.top = `${c}px`;
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
const Ks = "visual-designer-guides", Gi = "1.0.0";
class Qs {
  storageKey;
  constructor(e = Ks) {
    this.storageKey = e;
  }
  getGuides() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const i = JSON.parse(e);
      return i.version !== Gi ? (this.clear(), []) : i.guides || [];
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
    const i = { guides: e, version: Gi };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(e) {
    return this.getGuides().find((i) => i.id === e) || null;
  }
}
function Vs({ onExit: t }) {
  const e = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: _.bg,
    border: `2px solid ${_.primary}`,
    borderRadius: _.borderRadius,
    color: _.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: _.fontFamily,
    cursor: "pointer",
    zIndex: String(_.zIndex.controls),
    boxShadow: _.shadow,
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
        i.currentTarget.style.background = _.primary, i.currentTarget.style.color = _.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = _.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = _.bg, i.currentTarget.style.color = _.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = _.shadow;
      },
      children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function js() {
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
        border: `5px solid ${_.primary}`,
        pointerEvents: "none",
        zIndex: _.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function qs() {
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
        background: _.primary,
        color: _.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: _.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${_.primary}`,
        borderTop: "none",
        zIndex: _.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function Ys() {
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
        zIndex: _.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: _.fontFamily,
        pointerEvents: "auto"
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
                    borderTopColor: _.primary,
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
function Xs(t) {
  return /* @__PURE__ */ s(oe, { children: [
    t.showExitButton && /* @__PURE__ */ s(Vs, { onExit: t.onExitEditor }),
    t.showRedBorder && /* @__PURE__ */ s(js, {}),
    t.showBadge && /* @__PURE__ */ s(qs, {}),
    t.showLoading && /* @__PURE__ */ s(Ys, {})
  ] });
}
function Js(t, e) {
  Oe(/* @__PURE__ */ s(Xs, { ...e }), t);
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
  styleInjected = !1;
  constructor(e = {}) {
    this.config = e, this.guideId = e.guideId ?? null, this.templateId = e.templateId ?? null, this.storage = new Qs(e.storageKey), this.editorMode = new Mn(), this.guideRenderer = new nr(), this.featureHeatmapRenderer = new sr(), this.editorFrame = new Ws();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((i, n) => {
      const r = {
        guide_id: i.guide_id,
        step_index: n
      }, l = [...(i.templates || []).filter((c) => c.is_active)].sort((c, h) => c.step_order - h.step_order)[n];
      return l && (r.template_id = l.template_id, r.template_key = l.template.template_key, r.step_order = l.step_order, r.xpath = l.x_path), this.config.onGuideDismissed?.(i.guide_id), this.trackEvent("dismissed", r);
    }), this.guideRenderer.setOnNext((i, n, r) => {
      const l = [...(i.templates || []).filter((c) => c.is_active)].sort((c, h) => c.step_order - h.step_order)[n];
      if (l) {
        const c = n === r - 1;
        let h = "middle";
        n === 0 ? h = "first" : c && (h = "last");
        const u = {
          guide_id: i.guide_id,
          template_id: l.template_id,
          map_id: l.map_id,
          step_order: l.step_order,
          template_key: l.template.template_key,
          guide_step: h,
          xpath: l.x_path
        };
        return c && this.trackEvent("completed", u), this.trackEvent("viewed", u);
      }
    }), this.shouldEnableEditorMode() ? (this.showLoading = !0, this.renderOverlays(), this.enableEditor()) : this.loadGuides(), this.heatmapEnabled = localStorage.getItem("designerHeatmapEnabled") === "true", this.renderFeatureHeatmap(), this.setupEventListeners(), this.fetchGuides(), this.injectGlobalProtectionStyles();
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
    return this.storage.getGuidesByPage(ze());
  }
  saveGuide(e) {
    const i = {
      ...e,
      id: si(),
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
      const e = ze(), i = await ne.get(`/guides?target_page=${encodeURIComponent(e)}`);
      if (i && i.data) {
        this.fetchedGuides = Array.isArray(i.data) ? i.data : [i.data], console.log("[Visual Designer] Fetched guides for page:", e, this.fetchedGuides);
        for (const n of this.fetchedGuides)
          if (n.target_segment === null) {
            const o = `rg_guide_auto_${n.guide_id}`;
            if (!sessionStorage.getItem(o)) {
              console.log("[Visual Designer] Auto-triggering guide:", n.guide_name), this.guideRenderer.renderTriggeredGuide(n), sessionStorage.setItem(o, "true");
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
        const u = new Date(a).getTime();
        isNaN(u) || (o = Date.now() - u);
      }
      const c = (this._getStorageItem("__rg_visitor_traits") || {}).email || null, h = e.map((u) => {
        const d = u.properties || {};
        return {
          event_id: "evt_" + si(),
          event_type: "guide",
          event_name: u.eventName,
          timestamp: i,
          ingested_at: i,
          // Simulating server-side ingestion time
          visitor_id: n.visitor_id,
          account_id: n.account_id,
          session_id: n.session_id,
          page_url: r.page_url,
          visitor_email: c,
          session_duration_ms: o,
          element_id: d.element_id || d.xpath || null,
          guide_id: d.guide_id || null,
          properties: d
        };
      });
      console.log("[Visual Designer] Tracking Batch:", h), await ne.post("/guide-events", {
        events: h
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
    console.log("[Visual Designer] Click Event:", e);
    const i = e.target;
    if (!i) return;
    const n = pe.getXPath(i);
    console.log("[Visual Designer] Clicked Element XPath:", n);
    for (const r of this.fetchedGuides)
      console.log("Guide:", r), r.target_segment !== null && r.target_segment === n && (this.trackEvent("triggered", {
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
      page: ze()
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
    this.ensureSDKRoot(), this.sdkRoot && Js(this.sdkRoot, {
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
const ti = "1.0.0", Tn = "rg-web-sdk", Zs = "web", eo = 1, L = {
  VISITOR_ID: "__rg_visitor_id",
  ACCOUNT_ID: "__rg_account_id",
  SESSION_ID: "__rg_session_id",
  SESSION_START: "__rg_session_start",
  SESSION_LAST_ACTIVITY: "__rg_session_last_activity",
  EVENT_QUEUE: "__rg_event_queue",
  OPT_OUT: "__rg_opt_out",
  VISITOR_TRAITS: "__rg_visitor_traits",
  ACCOUNT_TRAITS: "__rg_account_traits"
}, to = {
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
}, Ie = {
  PAGE_VIEW: "page_view",
  CLICK: "click",
  INPUT: "input",
  SCROLL: "scroll",
  ERROR: "error"
}, Te = {
  NAVIGATION: "navigation",
  ENGAGEMENT: "engagement",
  DIAGNOSTIC: "diagnostic"
}, Qe = {
  NORMAL: "normal",
  RAGE_CLICK: "rage_click",
  ERROR_CLICK: "error_click",
  U_TURN: "u_turn"
}, He = {
  rageClickThreshold: 3,
  rageClickWindow: 1e3,
  deadClickDelay: 300,
  errorClickWindow: 2e3,
  uturnThreshold: 5e3
}, wt = [1e3, 2e3, 5e3, 1e4, 3e4], Hi = 5, io = 1e3, no = 100, ro = {
  click: { limit: 100, window: 1e3 },
  scroll: { limit: 10, window: 1e3 },
  input: { limit: 50, window: 1e3 }
}, Et = {
  pageView: 100,
  scroll: 500
}, $e = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
};
function Ve() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (t) => {
    const e = Math.random() * 16 | 0;
    return (t === "x" ? e : e & 3 | 8).toString(16);
  });
}
function je() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function so() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function oo() {
  const t = navigator.userAgent;
  return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(t) ? "tablet" : /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silfae|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(t) ? "mobile" : "desktop";
}
function ao() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Chrome") > -1 && t.indexOf("Edg") === -1 ? (e = "Chrome", i = t.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Safari") > -1 && t.indexOf("Chrome") === -1 ? (e = "Safari", i = t.match(/Version\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Firefox") > -1 ? (e = "Firefox", i = t.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Edg") > -1 ? (e = "Edge", i = t.match(/Edg\/([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("MSIE") > -1 || t.indexOf("Trident") > -1) && (e = "Internet Explorer", i = t.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || "Unknown"), { browserName: e, browserVersion: i };
}
function lo() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Win") > -1 ? (e = "Windows", t.indexOf("Windows NT 10.0") > -1 ? i = "10" : t.indexOf("Windows NT 6.3") > -1 ? i = "8.1" : t.indexOf("Windows NT 6.2") > -1 ? i = "8" : t.indexOf("Windows NT 6.1") > -1 && (i = "7")) : t.indexOf("Mac") > -1 ? (e = "macOS", i = t.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : t.indexOf("Linux") > -1 ? e = "Linux" : t.indexOf("Android") > -1 ? (e = "Android", i = t.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("iOS") > -1 || t.indexOf("iPhone") > -1 || t.indexOf("iPad") > -1) && (e = "iOS", i = t.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), { osName: e, osVersion: i };
}
function co() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Unknown";
  }
}
function uo(t) {
  try {
    const e = new URL(t), i = {};
    return e.searchParams.forEach((n, r) => {
      i[r] = n;
    }), i;
  } catch {
    return {};
  }
}
function Gt(t, e = 200) {
  return t ? t.length > e ? t.substring(0, e) : t : null;
}
function Ht(t, ...e) {
  return Object.assign({}, t, ...e);
}
function $i(t, e) {
  let i;
  return function(...r) {
    const o = () => {
      clearTimeout(i), t(...r);
    };
    clearTimeout(i), i = setTimeout(o, e);
  };
}
function ho(t, e = null) {
  try {
    return JSON.parse(t);
  } catch {
    return e;
  }
}
function Ct(t, e = null) {
  try {
    return JSON.stringify(t);
  } catch {
    return e;
  }
}
function v(t, ...e) {
  typeof console < "u" && console[t] && console[t]("[RG SDK]", ...e);
}
function fo(t) {
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
function po(t) {
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
function go(t) {
  if (!t) return null;
  const e = t.getAttribute("aria-label") || t.getAttribute("alt") || t.getAttribute("title") || (t.tagName === "INPUT" ? t.value : null) || t.textContent?.trim() || null;
  return Gt(e, 200);
}
function mo(t) {
  if (!t) return !1;
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0";
}
class yo {
  constructor(e = "localStorage") {
    this.preferredStorage = e, this.storageType = this._detectAvailableStorage(), this.memoryStorage = {};
  }
  _detectAvailableStorage() {
    return this.preferredStorage === "localStorage" && this._testStorage(window.localStorage) ? "localStorage" : this._testStorage(window.sessionStorage) ? "sessionStorage" : (v("warn", "No persistent storage available, using in-memory storage"), "memory");
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
      const n = this._getStorage(), r = Ct(i);
      return r ? (n ? n.setItem(e, r) : this.memoryStorage[e] = r, !0) : (v("warn", "Failed to serialize value for key:", e), !1);
    } catch (n) {
      if (n.name === "QuotaExceededError") {
        v("warn", "Storage quota exceeded, attempting cleanup"), this._cleanup();
        try {
          const r = this._getStorage();
          return r ? r.setItem(e, Ct(i)) : this.memoryStorage[e] = Ct(i), !0;
        } catch (r) {
          return v("error", "Failed to set item after cleanup:", e, r), !1;
        }
      }
      return v("error", "Failed to set item:", e, n), !1;
    }
  }
  getItem(e) {
    try {
      const i = this._getStorage();
      let n;
      return i ? n = i.getItem(e) : n = this.memoryStorage[e], n == null ? null : ho(n, null);
    } catch (i) {
      return v("error", "Failed to get item:", e, i), null;
    }
  }
  removeItem(e) {
    try {
      const i = this._getStorage();
      return i ? i.removeItem(e) : delete this.memoryStorage[e], !0;
    } catch (i) {
      return v("error", "Failed to remove item:", e, i), !1;
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
      return v("error", "Failed to clear storage:", e), !1;
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
        v("error", "Cleanup failed:", i);
      }
  }
  getStorageType() {
    return this.storageType;
  }
  isPersistent() {
    return this.storageType !== "memory";
  }
}
class _o {
  constructor(e, i) {
    this.storage = e, this.config = i, this.visitorId = null, this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this.sessionId = null, this.sessionStartTime = null, this.sessionLastActivity = null, this.sessionEventCount = 0, this.sessionProperties = {}, this.pendingIdentity = null;
  }
  initialize() {
    this._loadVisitor(), this._loadAccount(), this._loadOrCreateSession(), this.pendingIdentity && (this.identify(this.pendingIdentity.visitor, this.pendingIdentity.account), this.pendingIdentity = null), v("info", "Identity initialized:", {
      visitorId: this.visitorId,
      accountId: this.accountId,
      sessionId: this.sessionId
    });
  }
  _loadVisitor() {
    const e = this.storage.getItem(L.VISITOR_ID), i = this.storage.getItem(L.VISITOR_TRAITS) || {};
    e ? (this.visitorId = e, this.visitorTraits = i) : (this.visitorId = "anon_" + Ve(), this._persistVisitor());
  }
  _loadAccount() {
    const e = this.storage.getItem(L.ACCOUNT_ID), i = this.storage.getItem(L.ACCOUNT_TRAITS) || {};
    e && (this.accountId = e, this.accountTraits = i);
  }
  _loadOrCreateSession() {
    const e = this.storage.getItem(L.SESSION_ID), i = this.storage.getItem(L.SESSION_START), n = this.storage.getItem(L.SESSION_LAST_ACTIVITY), r = Date.now(), o = this.config.sessionTimeout * 60 * 1e3;
    if (e && n && r - new Date(n).getTime() < o) {
      this.sessionId = e, this.sessionStartTime = i, this.sessionLastActivity = n, this._updateSessionActivity();
      return;
    }
    this._createNewSession();
  }
  _createNewSession() {
    this.sessionId = "sess_" + Ve(), this.sessionStartTime = je(), this.sessionLastActivity = je(), this.sessionEventCount = 0, this._captureSessionProperties(), this._persistSession(), v("info", "New session created:", this.sessionId);
  }
  _captureSessionProperties() {
    const e = window.location.href, i = uo(e);
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
    this.sessionLastActivity = je(), this.sessionEventCount++, this.storage.setItem(L.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  _persistVisitor() {
    this.storage.setItem(L.VISITOR_ID, this.visitorId), this.storage.setItem(L.VISITOR_TRAITS, this.visitorTraits);
  }
  _persistAccount() {
    this.accountId && (this.storage.setItem(L.ACCOUNT_ID, this.accountId), this.storage.setItem(L.ACCOUNT_TRAITS, this.accountTraits));
  }
  _persistSession() {
    this.storage.setItem(L.SESSION_ID, this.sessionId), this.storage.setItem(L.SESSION_START, this.sessionStartTime), this.storage.setItem(L.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  identify(e, i = null) {
    if (e && e.id) {
      this.visitorId && this.visitorId !== e.id && !this.visitorId.startsWith("anon_") && v("warn", `Visitor ID changed from ${this.visitorId} to ${e.id}`), this.visitorId = e.id;
      const { id: n, ...r } = e;
      this.visitorTraits = Ht(this.visitorTraits, r), this._persistVisitor();
    }
    if (i && i.id) {
      this.accountId && this.accountId !== i.id && v("info", `Account changed from ${this.accountId} to ${i.id}`), this.accountId = i.id;
      const { id: n, ...r } = i;
      this.accountTraits = Ht(this.accountTraits, r), this._persistAccount();
    }
    v("info", "Identity updated:", {
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
    this.storage.removeItem(L.VISITOR_ID), this.storage.removeItem(L.VISITOR_TRAITS), this.storage.removeItem(L.ACCOUNT_ID), this.storage.removeItem(L.ACCOUNT_TRAITS), this.storage.removeItem(L.SESSION_ID), this.storage.removeItem(L.SESSION_START), this.storage.removeItem(L.SESSION_LAST_ACTIVITY), this.visitorId = "anon_" + Ve(), this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this._createNewSession(), this._persistVisitor(), v("info", "Identity reset");
  }
}
class vo {
  constructor(e) {
    this.identityManager = e, this.deviceInfo = this._captureDeviceInfo();
  }
  _captureDeviceInfo() {
    const { browserName: e, browserVersion: i } = ao(), { osName: n, osVersion: r } = lo();
    return {
      device_type: oo(),
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
      timezone: co()
    };
  }
  buildEvent(e) {
    const i = je(), n = this.identityManager.getIdentityContext(), r = {
      event_id: "evt_" + Ve(),
      visitor_id: n.visitor_id,
      account_id: n.account_id,
      session_id: n.session_id,
      event_name: e.event_name,
      event_type: e.event_type,
      timestamp: i,
      event_date: so(),
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
      sdk_version: ti,
      sdk_name: Tn,
      sdk_source: Zs,
      data_version: eo,
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
class bo {
  constructor(e, i) {
    this.storage = e, this.config = i, this.consentGranted = !i.requireConsent;
  }
  processEvent(e) {
    return this.isOptedOut() || this.config.requireConsent && !this.consentGranted || this.isInDoNotProcessList(e.visitor_id) || e._originalElement && this.isSensitiveElement(e._originalElement) ? null : (e = this.maskPII(e), e = this.removeBlacklistedFields(e), delete e._originalElement, e);
  }
  isOptedOut() {
    return this.storage.getItem(L.OPT_OUT) === !0;
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
        v("warn", "Invalid sensitive selector:", n);
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
    i = i.replace($e.email, "[EMAIL_REDACTED]"), i = i.replace($e.phone, "[PHONE_REDACTED]"), i = i.replace($e.ssn, "[SSN_REDACTED]"), i = i.replace($e.creditCard, "[CC_REDACTED]"), i = i.replace($e.ipAddress, "[IP_REDACTED]");
    const n = this.config.privacyConfig?.customPIIPatterns || [];
    for (const r of n)
      try {
        i = i.replace(r, "[REDACTED]");
      } catch {
        v("warn", "Invalid custom PII pattern:", r);
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
    this.consentGranted = !0, v("info", "User consent granted");
  }
  revokeConsent() {
    this.consentGranted = !1, v("info", "User consent revoked");
  }
  optOut() {
    this.storage.setItem(L.OPT_OUT, !0), v("info", "User opted out");
  }
  optIn() {
    this.storage.removeItem(L.OPT_OUT), v("info", "User opted in");
  }
  validateEventSize(e) {
    const i = JSON.stringify(e).length, n = 10 * 1024;
    return i > n ? (v("warn", "Event exceeds max size, truncating:", i), this.truncateEvent(e)) : e;
  }
  truncateEvent(e) {
    return e.element_text && (e.element_text = Gt(e.element_text, 100)), e.error_stack && (e.error_stack = Gt(e.error_stack, 500)), e.console_logs && (e.console_logs = e.console_logs.slice(0, 5)), e.custom_properties && JSON.stringify(e.custom_properties).length > 5e3 && (e.custom_properties = { _truncated: !0 }), e;
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
class xo {
  constructor() {
    this.clickHistory = [], this.deadClickTimers = /* @__PURE__ */ new Map(), this.recentErrors = [], this.navigationHistory = [], this._setupErrorListener(), this._setupNavigationListener();
  }
  detectClickInteraction(e, i) {
    const n = this._getElementKey(e), r = Date.now();
    return this._detectRageClick(n, r) ? Qe.RAGE_CLICK : this._detectErrorClick(n, r) ? Qe.ERROR_CLICK : (this._scheduleDeadClickCheck(e, n, r), Qe.NORMAL);
  }
  detectUTurn() {
    const e = Date.now(), i = this.navigationHistory;
    if (i.length < 2) return !1;
    const n = i[i.length - 1], r = i[i.length - 2];
    return n.url === r.url && e - r.time < He.uturnThreshold;
  }
  _detectRageClick(e, i) {
    return this.clickHistory.push({ elementKey: e, time: i }), this.clickHistory = this.clickHistory.filter(
      (r) => i - r.time < He.rageClickWindow
    ), this.clickHistory.filter(
      (r) => r.elementKey === e
    ).length >= He.rageClickThreshold;
  }
  _detectErrorClick(e, i) {
    return this.recentErrors = this.recentErrors.filter(
      (n) => i - n.time < He.errorClickWindow
    ), this.recentErrors.length > 0;
  }
  _scheduleDeadClickCheck(e, i, n) {
    this.deadClickTimers.has(i) && clearTimeout(this.deadClickTimers.get(i));
    const r = setTimeout(() => {
      this._isDeadClick(e, n) && v("debug", "Dead click detected:", i), this.deadClickTimers.delete(i);
    }, He.deadClickDelay);
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
class So {
  constructor(e, i, n) {
    this.eventBuilder = e, this.privacyEngine = i, this.config = n, this.listeners = [], this.lastPageViewTime = 0, this.lastPageViewUrl = null, this.scrollMilestones = {
      25: !1,
      50: !1,
      75: !1,
      100: !1
    }, this.rateLimiters = {}, this.onEventCapture = null, this.isRunning = !1, this.behavioralDetector = new xo();
  }
  start(e) {
    if (this.isRunning) {
      v("warn", "Auto-capture already running");
      return;
    }
    this.onEventCapture = e, this.isRunning = !0, this.config.autoPageViews && this._startPageViewTracking(), this.config.autoCapture && (this._startClickTracking(), this._startInputTracking(), this._startScrollTracking(), this._startErrorTracking()), v("info", "Auto-capture started");
  }
  stop() {
    this.isRunning && (this.listeners.forEach(({ target: e, event: i, handler: n, options: r }) => {
      e.removeEventListener(i, n, r);
    }), this.listeners = [], this.behavioralDetector && this.behavioralDetector.destroy(), this.isRunning = !1, v("info", "Auto-capture stopped"));
  }
  _addListener(e, i, n, r = !1) {
    e.addEventListener(i, n, r), this.listeners.push({ target: e, event: i, handler: n, options: r });
  }
  _checkRateLimit(e) {
    const i = ro[e];
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
    const e = history.pushState, i = history.replaceState, n = $i(() => this._capturePageView(), Et.pageView);
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
      event_name: Ie.PAGE_VIEW,
      event_type: Te.NAVIGATION,
      interaction_type: n ? Qe.U_TURN : Qe.NORMAL
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
    if (!mo(i))
      return;
    const n = this.behavioralDetector.detectClickInteraction(i, e), r = {
      event_name: Ie.CLICK,
      event_type: Te.ENGAGEMENT,
      element_id: i.id || null,
      element_class: i.classList ? Array.from(i.classList) : [],
      element_tag: i.tagName?.toLowerCase() || null,
      element_text: go(i),
      element_href: i.href || i.closest("a")?.href || null,
      element_xpath: fo(i),
      element_selector: po(i),
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
      event_name: Ie.INPUT,
      event_type: Te.ENGAGEMENT,
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
    const e = $i(() => this._handleScroll(), Et.scroll);
    this._addListener(window, "scroll", e);
  }
  _handleScroll() {
    if (!this._checkRateLimit("scroll"))
      return;
    const e = document.documentElement.scrollHeight, i = window.pageYOffset || document.documentElement.scrollTop, n = window.innerHeight, r = e - n, o = r > 0 ? Math.round(i / r * 100) : 100;
    let a = !1;
    const l = { 25: !1, 50: !1, 75: !1, 100: !1 };
    o >= 25 && !this.scrollMilestones[25] && (l[25] = !0, this.scrollMilestones[25] = !0, a = !0), o >= 50 && !this.scrollMilestones[50] && (l[50] = !0, this.scrollMilestones[50] = !0, a = !0), o >= 75 && !this.scrollMilestones[75] && (l[75] = !0, this.scrollMilestones[75] = !0, a = !0), o >= 100 && !this.scrollMilestones[100] && (l[100] = !0, this.scrollMilestones[100] = !0, a = !0), a && this._emit({
      event_name: Ie.SCROLL,
      event_type: Te.ENGAGEMENT,
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
      event_name: Ie.ERROR,
      event_type: Te.DIAGNOSTIC,
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
      event_name: Ie.ERROR,
      event_type: Te.DIAGNOSTIC,
      error_message: i?.message || String(i),
      error_type: i?.name || "UnhandledRejection",
      error_stack: i?.stack || null
    });
  }
  capturePage(e, i = {}) {
    this._emit({
      event_name: Ie.PAGE_VIEW,
      event_type: Te.NAVIGATION,
      custom_properties: { page_name: e, ...i }
    });
  }
}
class wo {
  constructor(e) {
    this.storage = e, this.queue = [], this.maxSize = io, this.maxPersistedSize = no, this._restore();
  }
  _restore() {
    try {
      const e = this.storage.getItem(L.EVENT_QUEUE);
      e && Array.isArray(e) && (this.queue = e, v("info", `Restored ${this.queue.length} events from storage`));
    } catch (e) {
      v("error", "Failed to restore events from storage:", e);
    }
  }
  _persist() {
    try {
      const e = this.queue.slice(-this.maxPersistedSize);
      this.storage.setItem(L.EVENT_QUEUE, e);
    } catch (e) {
      v("error", "Failed to persist events to storage:", e);
    }
  }
  enqueue(e) {
    if (this.queue.length >= this.maxSize) {
      const i = this.queue.shift();
      v("warn", "Event queue full, dropping oldest event:", i.event_id);
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
    return this.queue = [], this.storage.removeItem(L.EVENT_QUEUE), e;
  }
  size() {
    return this.queue.length;
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  clear() {
    this.queue = [], this.storage.removeItem(L.EVENT_QUEUE), v("info", "Event queue cleared");
  }
  getStats() {
    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      percentFull: Math.round(this.queue.length / this.maxSize * 100)
    };
  }
}
class Eo {
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
    }, e), this._setupUnloadHandler(), v("info", "Transport layer started");
  }
  stop() {
    this.batchTimer && (clearInterval(this.batchTimer), this.batchTimer = null), v("info", "Transport layer stopped");
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
      batch_id: "batch_" + Ve(),
      events: i,
      event_count: i.length,
      batch_timestamp: je()
    };
  }
  async _sendBatch(e = null, i = 0) {
    if (e || (e = this._createBatch()), !(!e || e.events.length === 0)) {
      this.isSending = !0;
      try {
        const n = await this._makeRequest(e);
        n.ok ? (this.eventQueue.dequeue(e.events.length), this.stats.sent += e.events.length, v("info", `Batch sent successfully: ${e.events.length} events`)) : await this._handleErrorResponse(n, e, i);
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
      "X-RG-SDK-Version": ti,
      "X-RG-SDK-Name": Tn
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
      r === 401 ? v("error", "Invalid API key. Please check your configuration.") : v("error", `Client error (${r}), dropping batch`), this.eventQueue.dequeue(i.events.length), this.stats.failed += i.events.length;
      return;
    }
    (r === 429 || r >= 500) && this._scheduleRetry(i, n);
  }
  _handleNetworkError(e, i, n) {
    v("error", "Network error:", e.message), this._scheduleRetry(i, n);
  }
  _scheduleRetry(e, i) {
    if (i >= Hi) {
      v("error", `Max retries exceeded for batch ${e.batch_id}, dropping events`), this.eventQueue.dequeue(e.events.length), this.stats.failed += e.events.length;
      return;
    }
    const n = wt[i] || wt[wt.length - 1], r = Date.now() + n;
    this.retryQueue.set(e.batch_id, {
      batch: e,
      retryCount: i + 1,
      nextRetry: r
    }), this.stats.retried++, v(
      "info",
      `Scheduling retry ${i + 1}/${Hi} for batch ${e.batch_id} in ${n}ms`
    ), setTimeout(() => {
      const o = this.retryQueue.get(e.batch_id);
      o && (this.retryQueue.delete(e.batch_id), this._sendBatch(o.batch, o.retryCount));
    }, n);
  }
  async flush() {
    if (!this.eventQueue.isEmpty()) {
      for (v("info", "Flushing event queue..."), this._isFlushRequested = !0; !this.eventQueue.isEmpty() && !this.isSending; )
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
        navigator.sendBeacon(i, n) ? (this.eventQueue.dequeue(e.events.length), v("info", `Sent ${e.events.length} events via sendBeacon`)) : v("warn", "sendBeacon failed, events may be lost");
      } else
        v("warn", "sendBeacon not available, events may be lost");
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
class Co {
  constructor() {
    this.initialized = !1, this.config = null, this.storage = null, this.identityManager = null, this.eventBuilder = null, this.privacyEngine = null, this.autoCaptureEngine = null, this.eventQueue = null, this.transportLayer = null, this.pendingIdentify = null;
  }
  initialize(e) {
    if (this.initialized) {
      v("warn", "SDK already initialized");
      return;
    }
    if (!e || !e.apiKey)
      throw new Error("API key is required");
    this.config = Ht(to, e), v("info", "Initializing RG SDK...", {
      version: ti,
      config: this.config
    }), this._initializeModules(), this.initialized = !0, this.pendingIdentify && (this.identify(this.pendingIdentify.visitor, this.pendingIdentify.account), this.pendingIdentify = null), v("info", "RG SDK initialized successfully");
  }
  _initializeModules() {
    this.storage = new yo(this.config.persistence), this.identityManager = new _o(this.storage, this.config), this.identityManager.initialize(), this.eventBuilder = new vo(this.identityManager), this.privacyEngine = new bo(this.storage, this.config), this.eventQueue = new wo(this.storage), this.transportLayer = new Eo(this.config, this.eventQueue), this.transportLayer.start(), this.autoCaptureEngine = new So(
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
      this.pendingIdentify = { visitor: e, account: i }, v("info", "Identity queued, will be applied after initialization");
      return;
    }
    this.identityManager.identify(e, i);
  }
  track(e, i = {}) {
    if (!this.initialized) {
      v("warn", "SDK not initialized, cannot track event");
      return;
    }
    if (!e || typeof e != "string") {
      v("warn", "Event name is required and must be a string");
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
      v("warn", "SDK not initialized, cannot track page view");
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
      v("warn", "SDK not initialized");
      return;
    }
    await this.transportLayer.flush();
  }
  optOut() {
    if (!this.initialized) {
      v("warn", "SDK not initialized");
      return;
    }
    this.autoCaptureEngine && this.autoCaptureEngine.stop(), this.eventQueue.clear(), this.privacyEngine.optOut(), v("info", "User opted out of tracking");
  }
  optIn() {
    if (!this.initialized) {
      v("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.optIn(), (this.config.autoCapture || this.config.autoPageViews) && this.autoCaptureEngine.start((e) => this._handleCapturedEvent(e)), v("info", "User opted in to tracking");
  }
  grantConsent() {
    if (!this.initialized) {
      v("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.grantConsent();
  }
  revokeConsent() {
    if (!this.initialized) {
      v("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.revokeConsent(), this.eventQueue.clear();
  }
  reset() {
    if (!this.initialized) {
      v("warn", "SDK not initialized");
      return;
    }
    this.identityManager.reset(), v("info", "Identity reset");
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
    this.config.debug = e, v("info", `Debug mode ${e ? "enabled" : "disabled"}`);
  }
}
const Z = new Co(), se = {
  initialize: (t) => {
    Z.initialize(t);
  },
  identify: (t, e) => {
    Z.identify(t, e);
  },
  track: (t, e) => {
    Z.track(t, e);
  },
  page: (t, e) => {
    Z.page(t, e);
  },
  flush: () => Z.flush(),
  optOut: () => {
    Z.optOut();
  },
  optIn: () => {
    Z.optIn();
  },
  grantConsent: () => {
    Z.grantConsent();
  },
  revokeConsent: () => {
    Z.revokeConsent();
  },
  reset: () => {
    Z.reset();
  },
  getVisitorId: () => Z.getVisitorId(),
  getAccountId: () => Z.getAccountId(),
  getSessionId: () => Z.getSessionId(),
  getStats: () => Z.getStats(),
  debug: (t) => {
    Z.debug(t);
  },
  version: "1.0.0"
};
typeof window < "u" && (window.rg = se);
let Y = null, kn = !1;
const Rn = "designerGuideId", On = "designerTemplateId";
let An = null, Pn = null;
function Io() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(Rn) : null;
  } catch {
    return null;
  }
}
function To() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(On) : null;
  } catch {
    return null;
  }
}
function ye(t) {
  return t?.apiKey ? se.initialize(t) : console.warn("[Revgain] No apiKey found in config. Analytics will not start."), Y || (Y = new In({
    ...t,
    guideId: An ?? t?.guideId ?? Io() ?? null,
    templateId: Pn ?? t?.templateId ?? To() ?? null
  }), Y.init(), Y);
}
function ii(t, e) {
  se.identify(t, e);
}
function ni(t, e) {
  se.track(t, e);
}
function ct() {
  return Y;
}
function Dn(t) {
  if (!t || !Array.isArray(t)) return;
  t.splice(0, t.length).forEach((i) => {
    if (!i || !Array.isArray(i) || i.length === 0) return;
    const n = i[0], r = i.slice(1);
    try {
      switch (n) {
        case "initialize":
        case "init":
          ye(r[0]);
          break;
        case "identify":
          ii(r[0], r[1]);
          break;
        case "track":
          ni(r[0], r[1]);
          break;
        case "enableEditor":
          (Y ?? ye()).enableEditor();
          break;
        case "disableEditor":
          Y?.disableEditor();
          break;
        case "loadGuides":
          Y?.loadGuides();
          break;
        case "getGuides":
          return Y?.getGuides();
        default:
          typeof se[n] == "function" ? se[n](...r) : console.warn("[Revgain] Unknown snippet method:", n);
      }
    } catch (o) {
      console.error("[Revgain] Error processing queued call:", n, o);
    }
  });
}
if (typeof window < "u") {
  const t = window.revgain || window.visualDesigner;
  t && Array.isArray(t._q) && (kn = !0, t.init = ye, t.initialize = ye, t.identify = ii, t.track = ni, t.enableEditor = () => (Y ?? ye()).enableEditor(), t.disableEditor = () => Y?.disableEditor(), t.loadGuides = () => Y?.loadGuides(), t.getGuides = () => Y?.getGuides(), t.getInstance = ct, t.page = (e, i) => se.page(e, i), t.flush = () => se.flush(), t.reset = () => se.reset(), Dn(t._q));
  try {
    const e = new URL(window.location.href), i = e.searchParams.get("designer"), n = e.searchParams.get("mode"), r = e.searchParams.get("iud"), o = e.searchParams.get("guide_id"), a = e.searchParams.get("template_id");
    (i === "true" || o != null || a != null) && console.log("[Revgain] URL params detected:", { designerParam: i, modeParam: n, guideIdParam: o }), i === "true" && (n && (window.__visualDesignerMode = n, localStorage.setItem("designerModeType", n)), localStorage.setItem("designerMode", "true"), r && localStorage.setItem(xn, r), o != null && (An = o, localStorage.setItem(Rn, o)), a != null && (Pn = a, localStorage.setItem(On, a)), e.searchParams.delete("designer"), e.searchParams.delete("mode"), e.searchParams.delete("iud"), e.searchParams.delete("guide_id"), e.searchParams.delete("template_id"), window.history.replaceState({}, "", e.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !Y && !kn) {
  const t = localStorage.getItem("designerMode") === "true", e = () => {
    !Y && t && ye();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
if (typeof window < "u") {
  const t = {
    init: ye,
    initialize: ye,
    identify: ii,
    track: ni,
    page: (e, i) => se.page(e, i),
    flush: () => se.flush(),
    reset: () => se.reset(),
    getInstance: ct,
    DesignerSDK: In,
    apiClient: ne,
    _processQueue: Dn,
    getGuideId: () => ct()?.getGuideId() ?? null,
    getTemplateId: () => ct()?.getTemplateId() ?? null,
    enableEditor: () => (Y ?? ye()).enableEditor(),
    disableEditor: () => Y?.disableEditor(),
    analytics: se
  };
  window.revgain = t, window.VisualDesigner = t;
}
export {
  In as DesignerSDK,
  Dn as _processQueue,
  ne as apiClient,
  ct as getInstance,
  ii as identify,
  ye as init,
  se as rg,
  ni as track
};
