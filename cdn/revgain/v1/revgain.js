class Se {
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
      const a = e.getAttribute("data-testid");
      return {
        selector: `[data-testid="${this.escapeAttribute(a)}"]`,
        confidence: "high",
        method: "data-testid"
      };
    }
    const r = this.getSemanticDataAttributes(e);
    if (r.length > 0) {
      const a = r[0], d = e.getAttribute(a);
      return {
        selector: `[${a}="${this.escapeAttribute(d)}"]`,
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
    let n = e;
    for (; n && n !== document.documentElement; ) {
      const l = n.tagName.toLowerCase(), a = n.parentElement;
      if (!a) {
        i.unshift(l);
        break;
      }
      const u = Array.from(a.children).filter((h) => h.tagName === n.tagName).indexOf(n) + 1;
      i.unshift(`${l}[${u}]`), n = a;
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
    const n = i[1].trim(), r = i[2].replace(/\\'/g, "'"), o = this.normalizeText(r), l = document.querySelectorAll(n);
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
    return new Promise((n, r) => {
      const o = this.findElement(e);
      if (o) return n(o);
      const l = new MutationObserver(() => {
        const a = this.findElement(e);
        a && (l.disconnect(), n(a));
      });
      l.observe(document.body, {
        childList: !0
      }), setTimeout(() => {
        l.disconnect(), r(new Error(`Element not found: ${e}`));
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
        const l = n.className.split(/\s+/).filter((a) => a && !a.startsWith("designer-")).slice(0, 2);
        l.length > 0 && (r += "." + l.map((a) => this.escapeSelector(a)).join("."));
      }
      const o = n.parentElement;
      if (o) {
        const l = Array.from(o.children).filter(
          (a) => a.tagName === n.tagName
        );
        l.length > 1 && (r += `:nth-of-type(${l.indexOf(n) + 1})`);
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
    const a = [];
    if (r) {
      a.push(`#${this.escapeSelector(n.id)}`);
      for (let d = 1; d < o.length; d++) a.push(this.buildSegment(o[d]));
    } else {
      const d = (n.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (d.length < 2) return null;
      const u = this.generatePathSelector(n);
      if (!u) return null;
      const h = d.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      a.push(`${u}:contains('${h}')`);
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
function Jn(t) {
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
function bi(t) {
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0" && t.getBoundingClientRect().height > 0 && t.getBoundingClientRect().width > 0;
}
function Ge() {
  return window.location.pathname || "/";
}
function xi() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Zn(t) {
  const e = t.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function Lt(t) {
  Zn(t) || t.scrollIntoView({ behavior: "smooth", block: "center" });
}
function de(t) {
  return t.content && t.content.trim() !== "" ? t.content : t.template?.content || "";
}
const Si = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class er {
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
      if (i.closest(Si)) {
        this.hideHighlight();
        return;
      }
      if (!bi(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (e) => {
    if (!this.isActive) return;
    const i = e.target;
    i && (i.closest(Si) || (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), bi(i) && this.selectElement(i)));
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
    const i = Se.generateSelector(e), n = Jn(e), r = Se.getXPath(e);
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
var Ot, F, ln, Ue, wi, cn, dn, un, ni, Ht, $t, hn, ot = {}, fn = [], tr = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, ct = Array.isArray;
function Ie(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function ri(t) {
  t && t.parentNode && t.parentNode.removeChild(t);
}
function Vt(t, e, i) {
  var n, r, o, l = {};
  for (o in e) o == "key" ? n = e[o] : o == "ref" ? r = e[o] : l[o] = e[o];
  if (arguments.length > 2 && (l.children = arguments.length > 3 ? Ot.call(arguments, 2) : i), typeof t == "function" && t.defaultProps != null) for (o in t.defaultProps) l[o] === void 0 && (l[o] = t.defaultProps[o]);
  return wt(t, l, n, r, null);
}
function wt(t, e, i, n, r) {
  var o = { type: t, props: e, key: i, ref: n, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: r ?? ++ln, __i: -1, __u: 0 };
  return r == null && F.vnode != null && F.vnode(o), o;
}
function X(t) {
  return t.children;
}
function ke(t, e) {
  this.props = t, this.context = e;
}
function Ye(t, e) {
  if (e == null) return t.__ ? Ye(t.__, t.__i + 1) : null;
  for (var i; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) return i.__e;
  return typeof t.type == "function" ? Ye(t) : null;
}
function pn(t) {
  var e, i;
  if ((t = t.__) != null && t.__c != null) {
    for (t.__e = t.__c.base = null, e = 0; e < t.__k.length; e++) if ((i = t.__k[e]) != null && i.__e != null) {
      t.__e = t.__c.base = i.__e;
      break;
    }
    return pn(t);
  }
}
function Kt(t) {
  (!t.__d && (t.__d = !0) && Ue.push(t) && !It.__r++ || wi != F.debounceRendering) && ((wi = F.debounceRendering) || cn)(It);
}
function It() {
  for (var t, e, i, n, r, o, l, a = 1; Ue.length; ) Ue.length > a && Ue.sort(dn), t = Ue.shift(), a = Ue.length, t.__d && (i = void 0, n = void 0, r = (n = (e = t).__v).__e, o = [], l = [], e.__P && ((i = Ie({}, n)).__v = n.__v + 1, F.vnode && F.vnode(i), si(e.__P, i, n, e.__n, e.__P.namespaceURI, 32 & n.__u ? [r] : null, o, r ?? Ye(n), !!(32 & n.__u), l), i.__v = n.__v, i.__.__k[i.__i] = i, yn(o, i, l), n.__e = n.__ = null, i.__e != r && pn(i)));
  It.__r = 0;
}
function mn(t, e, i, n, r, o, l, a, d, u, h) {
  var c, f, m, y, b, x, C, g = n && n.__k || fn, A = e.length;
  for (d = ir(i, e, g, d, A), c = 0; c < A; c++) (m = i.__k[c]) != null && (f = m.__i == -1 ? ot : g[m.__i] || ot, m.__i = c, x = si(t, m, f, r, o, l, a, d, u, h), y = m.__e, m.ref && f.ref != m.ref && (f.ref && oi(f.ref, null, m), h.push(m.ref, m.__c || y, m)), b == null && y != null && (b = y), (C = !!(4 & m.__u)) || f.__k === m.__k ? d = gn(m, d, t, C) : typeof m.type == "function" && x !== void 0 ? d = x : y && (d = y.nextSibling), m.__u &= -7);
  return i.__e = b, d;
}
function ir(t, e, i, n, r) {
  var o, l, a, d, u, h = i.length, c = h, f = 0;
  for (t.__k = new Array(r), o = 0; o < r; o++) (l = e[o]) != null && typeof l != "boolean" && typeof l != "function" ? (typeof l == "string" || typeof l == "number" || typeof l == "bigint" || l.constructor == String ? l = t.__k[o] = wt(null, l, null, null, null) : ct(l) ? l = t.__k[o] = wt(X, { children: l }, null, null, null) : l.constructor === void 0 && l.__b > 0 ? l = t.__k[o] = wt(l.type, l.props, l.key, l.ref ? l.ref : null, l.__v) : t.__k[o] = l, d = o + f, l.__ = t, l.__b = t.__b + 1, a = null, (u = l.__i = nr(l, i, d, c)) != -1 && (c--, (a = i[u]) && (a.__u |= 2)), a == null || a.__v == null ? (u == -1 && (r > h ? f-- : r < h && f++), typeof l.type != "function" && (l.__u |= 4)) : u != d && (u == d - 1 ? f-- : u == d + 1 ? f++ : (u > d ? f-- : f++, l.__u |= 4))) : t.__k[o] = null;
  if (c) for (o = 0; o < h; o++) (a = i[o]) != null && (2 & a.__u) == 0 && (a.__e == n && (n = Ye(a)), vn(a, a));
  return n;
}
function gn(t, e, i, n) {
  var r, o;
  if (typeof t.type == "function") {
    for (r = t.__k, o = 0; r && o < r.length; o++) r[o] && (r[o].__ = t, e = gn(r[o], e, i, n));
    return e;
  }
  t.__e != e && (n && (e && t.type && !e.parentNode && (e = Ye(t)), i.insertBefore(t.__e, e || null)), e = t.__e);
  do
    e = e && e.nextSibling;
  while (e != null && e.nodeType == 8);
  return e;
}
function kt(t, e) {
  return e = e || [], t == null || typeof t == "boolean" || (ct(t) ? t.some(function(i) {
    kt(i, e);
  }) : e.push(t)), e;
}
function nr(t, e, i, n) {
  var r, o, l, a = t.key, d = t.type, u = e[i], h = u != null && (2 & u.__u) == 0;
  if (u === null && a == null || h && a == u.key && d == u.type) return i;
  if (n > (h ? 1 : 0)) {
    for (r = i - 1, o = i + 1; r >= 0 || o < e.length; ) if ((u = e[l = r >= 0 ? r-- : o++]) != null && (2 & u.__u) == 0 && a == u.key && d == u.type) return l;
  }
  return -1;
}
function Ei(t, e, i) {
  e[0] == "-" ? t.setProperty(e, i ?? "") : t[e] = i == null ? "" : typeof i != "number" || tr.test(e) ? i : i + "px";
}
function pt(t, e, i, n, r) {
  var o, l;
  e: if (e == "style") if (typeof i == "string") t.style.cssText = i;
  else {
    if (typeof n == "string" && (t.style.cssText = n = ""), n) for (e in n) i && e in i || Ei(t.style, e, "");
    if (i) for (e in i) n && i[e] == n[e] || Ei(t.style, e, i[e]);
  }
  else if (e[0] == "o" && e[1] == "n") o = e != (e = e.replace(un, "$1")), l = e.toLowerCase(), e = l in t || e == "onFocusOut" || e == "onFocusIn" ? l.slice(2) : e.slice(2), t.l || (t.l = {}), t.l[e + o] = i, i ? n ? i.u = n.u : (i.u = ni, t.addEventListener(e, o ? $t : Ht, o)) : t.removeEventListener(e, o ? $t : Ht, o);
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
function Ci(t) {
  return function(e) {
    if (this.l) {
      var i = this.l[e.type + t];
      if (e.t == null) e.t = ni++;
      else if (e.t < i.u) return;
      return i(F.event ? F.event(e) : e);
    }
  };
}
function si(t, e, i, n, r, o, l, a, d, u) {
  var h, c, f, m, y, b, x, C, g, A, O, P, M, G, L, U, B, k = e.type;
  if (e.constructor !== void 0) return null;
  128 & i.__u && (d = !!(32 & i.__u), o = [a = e.__e = i.__e]), (h = F.__b) && h(e);
  e: if (typeof k == "function") try {
    if (C = e.props, g = "prototype" in k && k.prototype.render, A = (h = k.contextType) && n[h.__c], O = h ? A ? A.props.value : h.__ : n, i.__c ? x = (c = e.__c = i.__c).__ = c.__E : (g ? e.__c = c = new k(C, O) : (e.__c = c = new ke(C, O), c.constructor = k, c.render = sr), A && A.sub(c), c.state || (c.state = {}), c.__n = n, f = c.__d = !0, c.__h = [], c._sb = []), g && c.__s == null && (c.__s = c.state), g && k.getDerivedStateFromProps != null && (c.__s == c.state && (c.__s = Ie({}, c.__s)), Ie(c.__s, k.getDerivedStateFromProps(C, c.__s))), m = c.props, y = c.state, c.__v = e, f) g && k.getDerivedStateFromProps == null && c.componentWillMount != null && c.componentWillMount(), g && c.componentDidMount != null && c.__h.push(c.componentDidMount);
    else {
      if (g && k.getDerivedStateFromProps == null && C !== m && c.componentWillReceiveProps != null && c.componentWillReceiveProps(C, O), e.__v == i.__v || !c.__e && c.shouldComponentUpdate != null && c.shouldComponentUpdate(C, c.__s, O) === !1) {
        for (e.__v != i.__v && (c.props = C, c.state = c.__s, c.__d = !1), e.__e = i.__e, e.__k = i.__k, e.__k.some(function(H) {
          H && (H.__ = e);
        }), P = 0; P < c._sb.length; P++) c.__h.push(c._sb[P]);
        c._sb = [], c.__h.length && l.push(c);
        break e;
      }
      c.componentWillUpdate != null && c.componentWillUpdate(C, c.__s, O), g && c.componentDidUpdate != null && c.__h.push(function() {
        c.componentDidUpdate(m, y, b);
      });
    }
    if (c.context = O, c.props = C, c.__P = t, c.__e = !1, M = F.__r, G = 0, g) {
      for (c.state = c.__s, c.__d = !1, M && M(e), h = c.render(c.props, c.state, c.context), L = 0; L < c._sb.length; L++) c.__h.push(c._sb[L]);
      c._sb = [];
    } else do
      c.__d = !1, M && M(e), h = c.render(c.props, c.state, c.context), c.state = c.__s;
    while (c.__d && ++G < 25);
    c.state = c.__s, c.getChildContext != null && (n = Ie(Ie({}, n), c.getChildContext())), g && !f && c.getSnapshotBeforeUpdate != null && (b = c.getSnapshotBeforeUpdate(m, y)), U = h, h != null && h.type === X && h.key == null && (U = _n(h.props.children)), a = mn(t, ct(U) ? U : [U], e, i, n, r, o, l, a, d, u), c.base = e.__e, e.__u &= -161, c.__h.length && l.push(c), x && (c.__E = c.__ = null);
  } catch (H) {
    if (e.__v = null, d || o != null) if (H.then) {
      for (e.__u |= d ? 160 : 128; a && a.nodeType == 8 && a.nextSibling; ) a = a.nextSibling;
      o[o.indexOf(a)] = null, e.__e = a;
    } else {
      for (B = o.length; B--; ) ri(o[B]);
      qt(e);
    }
    else e.__e = i.__e, e.__k = i.__k, H.then || qt(e);
    F.__e(H, e, i);
  }
  else o == null && e.__v == i.__v ? (e.__k = i.__k, e.__e = i.__e) : a = e.__e = rr(i.__e, e, i, n, r, o, l, d, u);
  return (h = F.diffed) && h(e), 128 & e.__u ? void 0 : a;
}
function qt(t) {
  t && t.__c && (t.__c.__e = !0), t && t.__k && t.__k.forEach(qt);
}
function yn(t, e, i) {
  for (var n = 0; n < i.length; n++) oi(i[n], i[++n], i[++n]);
  F.__c && F.__c(e, t), t.some(function(r) {
    try {
      t = r.__h, r.__h = [], t.some(function(o) {
        o.call(r);
      });
    } catch (o) {
      F.__e(o, r.__v);
    }
  });
}
function _n(t) {
  return typeof t != "object" || t == null || t.__b && t.__b > 0 ? t : ct(t) ? t.map(_n) : Ie({}, t);
}
function rr(t, e, i, n, r, o, l, a, d) {
  var u, h, c, f, m, y, b, x = i.props || ot, C = e.props, g = e.type;
  if (g == "svg" ? r = "http://www.w3.org/2000/svg" : g == "math" ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), o != null) {
    for (u = 0; u < o.length; u++) if ((m = o[u]) && "setAttribute" in m == !!g && (g ? m.localName == g : m.nodeType == 3)) {
      t = m, o[u] = null;
      break;
    }
  }
  if (t == null) {
    if (g == null) return document.createTextNode(C);
    t = document.createElementNS(r, g, C.is && C), a && (F.__m && F.__m(e, o), a = !1), o = null;
  }
  if (g == null) x === C || a && t.data == C || (t.data = C);
  else {
    if (o = o && Ot.call(t.childNodes), !a && o != null) for (x = {}, u = 0; u < t.attributes.length; u++) x[(m = t.attributes[u]).name] = m.value;
    for (u in x) if (m = x[u], u != "children") {
      if (u == "dangerouslySetInnerHTML") c = m;
      else if (!(u in C)) {
        if (u == "value" && "defaultValue" in C || u == "checked" && "defaultChecked" in C) continue;
        pt(t, u, null, m, r);
      }
    }
    for (u in C) m = C[u], u == "children" ? f = m : u == "dangerouslySetInnerHTML" ? h = m : u == "value" ? y = m : u == "checked" ? b = m : a && typeof m != "function" || x[u] === m || pt(t, u, m, x[u], r);
    if (h) a || c && (h.__html == c.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), e.__k = [];
    else if (c && (t.innerHTML = ""), mn(e.type == "template" ? t.content : t, ct(f) ? f : [f], e, i, n, g == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r, o, l, o ? o[0] : i.__k && Ye(i, 0), a, d), o != null) for (u = o.length; u--; ) ri(o[u]);
    a || (u = "value", g == "progress" && y == null ? t.removeAttribute("value") : y != null && (y !== t[u] || g == "progress" && !y || g == "option" && y != x[u]) && pt(t, u, y, x[u], r), u = "checked", b != null && b != t[u] && pt(t, u, b, x[u], r));
  }
  return t;
}
function oi(t, e, i) {
  try {
    if (typeof t == "function") {
      var n = typeof t.__u == "function";
      n && t.__u(), n && e == null || (t.__u = t(e));
    } else t.current = e;
  } catch (r) {
    F.__e(r, i);
  }
}
function vn(t, e, i) {
  var n, r;
  if (F.unmount && F.unmount(t), (n = t.ref) && (n.current && n.current != t.__e || oi(n, null, e)), (n = t.__c) != null) {
    if (n.componentWillUnmount) try {
      n.componentWillUnmount();
    } catch (o) {
      F.__e(o, e);
    }
    n.base = n.__P = null;
  }
  if (n = t.__k) for (r = 0; r < n.length; r++) n[r] && vn(n[r], e, i || typeof t.type != "function");
  i || ri(t.__e), t.__c = t.__ = t.__e = void 0;
}
function sr(t, e, i) {
  return this.constructor(t, i);
}
function Le(t, e, i) {
  var n, r, o, l;
  e == document && (e = document.documentElement), F.__ && F.__(t, e), r = (n = !1) ? null : e.__k, o = [], l = [], si(e, t = e.__k = Vt(X, null, [t]), r || ot, ot, e.namespaceURI, r ? null : e.firstChild ? Ot.call(e.childNodes) : null, o, r ? r.__e : e.firstChild, n, l), yn(o, t, l);
}
function ai(t) {
  function e(i) {
    var n, r;
    return this.getChildContext || (n = /* @__PURE__ */ new Set(), (r = {})[e.__c] = this, this.getChildContext = function() {
      return r;
    }, this.componentWillUnmount = function() {
      n = null;
    }, this.shouldComponentUpdate = function(o) {
      this.props.value != o.value && n.forEach(function(l) {
        l.__e = !0, Kt(l);
      });
    }, this.sub = function(o) {
      n.add(o);
      var l = o.componentWillUnmount;
      o.componentWillUnmount = function() {
        n && n.delete(o), l && l.call(o);
      };
    }), i.children;
  }
  return e.__c = "__cC" + hn++, e.__ = t, e.Provider = e.__l = (e.Consumer = function(i, n) {
    return i.children(n);
  }).contextType = e, e;
}
Ot = fn.slice, F = { __e: function(t, e, i, n) {
  for (var r, o, l; e = e.__; ) if ((r = e.__c) && !r.__) try {
    if ((o = r.constructor) && o.getDerivedStateFromError != null && (r.setState(o.getDerivedStateFromError(t)), l = r.__d), r.componentDidCatch != null && (r.componentDidCatch(t, n || {}), l = r.__d), l) return r.__E = r;
  } catch (a) {
    t = a;
  }
  throw t;
} }, ln = 0, ke.prototype.setState = function(t, e) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = Ie({}, this.state), typeof t == "function" && (t = t(Ie({}, i), this.props)), t && Ie(i, t), t != null && this.__v && (e && this._sb.push(e), Kt(this));
}, ke.prototype.forceUpdate = function(t) {
  this.__v && (this.__e = !0, t && this.__h.push(t), Kt(this));
}, ke.prototype.render = X, Ue = [], cn = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, dn = function(t, e) {
  return t.__v.__b - e.__v.__b;
}, It.__r = 0, un = /(PointerCapture)$|Capture$/i, ni = 0, Ht = Ci(!1), $t = Ci(!0), hn = 0;
var or = 0;
function s(t, e, i, n, r, o) {
  e || (e = {});
  var l, a, d = e;
  if ("ref" in d) for (a in d = {}, e) a == "ref" ? l = e[a] : d[a] = e[a];
  var u = { type: t, props: d, key: i, ref: l, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --or, __i: -1, __u: 0, __source: r, __self: o };
  if (typeof t == "function" && (l = t.defaultProps)) for (a in l) d[a] === void 0 && (d[a] = l[a]);
  return F.vnode && F.vnode(u), u;
}
const v = {
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
function ar({ guide: t, top: e, left: i, arrowStyle: n, onDismiss: r }) {
  return /* @__PURE__ */ s(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": t.id,
      style: {
        position: "absolute",
        background: v.bg,
        border: `2px solid ${v.primary}`,
        borderRadius: v.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: v.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: v.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: v.text,
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
              background: v.primary,
              color: v.bg,
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
var He, V, Ft, Ii, at = 0, bn = [], j = F, ki = j.__b, Ti = j.__r, Ri = j.diffed, Oi = j.__c, Pi = j.unmount, Ai = j.__;
function dt(t, e) {
  j.__h && j.__h(V, t, at || e), at = 0;
  var i = V.__H || (V.__H = { __: [], __h: [] });
  return t >= i.__.length && i.__.push({}), i.__[t];
}
function E(t) {
  return at = 1, lr(xn, t);
}
function lr(t, e, i) {
  var n = dt(He++, 2);
  if (n.t = t, !n.__c && (n.__ = [i ? i(e) : xn(void 0, e), function(a) {
    var d = n.__N ? n.__N[0] : n.__[0], u = n.t(d, a);
    d !== u && (n.__N = [u, n.__[1]], n.__c.setState({}));
  }], n.__c = V, !V.__f)) {
    var r = function(a, d, u) {
      if (!n.__c.__H) return !0;
      var h = n.__c.__H.__.filter(function(f) {
        return !!f.__c;
      });
      if (h.every(function(f) {
        return !f.__N;
      })) return !o || o.call(this, a, d, u);
      var c = n.__c.props !== a;
      return h.forEach(function(f) {
        if (f.__N) {
          var m = f.__[0];
          f.__ = f.__N, f.__N = void 0, m !== f.__[0] && (c = !0);
        }
      }), o && o.call(this, a, d, u) || c;
    };
    V.__f = !0;
    var o = V.shouldComponentUpdate, l = V.componentWillUpdate;
    V.componentWillUpdate = function(a, d, u) {
      if (this.__e) {
        var h = o;
        o = void 0, r(a, d, u), o = h;
      }
      l && l.call(this, a, d, u);
    }, V.shouldComponentUpdate = r;
  }
  return n.__N || n.__;
}
function te(t, e) {
  var i = dt(He++, 3);
  !j.__s && ci(i.__H, e) && (i.__ = t, i.u = e, V.__H.__h.push(i));
}
function cr(t, e) {
  var i = dt(He++, 4);
  !j.__s && ci(i.__H, e) && (i.__ = t, i.u = e, V.__h.push(i));
}
function dr(t) {
  return at = 5, we(function() {
    return { current: t };
  }, []);
}
function we(t, e) {
  var i = dt(He++, 7);
  return ci(i.__H, e) && (i.__ = t(), i.__H = e, i.__h = t), i.__;
}
function be(t, e) {
  return at = 8, we(function() {
    return t;
  }, e);
}
function li(t) {
  var e = V.context[t.__c], i = dt(He++, 9);
  return i.c = t, e ? (i.__ == null && (i.__ = !0, e.sub(V)), e.props.value) : t.__;
}
function ur() {
  for (var t; t = bn.shift(); ) if (t.__P && t.__H) try {
    t.__H.__h.forEach(Et), t.__H.__h.forEach(Qt), t.__H.__h = [];
  } catch (e) {
    t.__H.__h = [], j.__e(e, t.__v);
  }
}
j.__b = function(t) {
  V = null, ki && ki(t);
}, j.__ = function(t, e) {
  t && e.__k && e.__k.__m && (t.__m = e.__k.__m), Ai && Ai(t, e);
}, j.__r = function(t) {
  Ti && Ti(t), He = 0;
  var e = (V = t.__c).__H;
  e && (Ft === V ? (e.__h = [], V.__h = [], e.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (e.__h.forEach(Et), e.__h.forEach(Qt), e.__h = [], He = 0)), Ft = V;
}, j.diffed = function(t) {
  Ri && Ri(t);
  var e = t.__c;
  e && e.__H && (e.__H.__h.length && (bn.push(e) !== 1 && Ii === j.requestAnimationFrame || ((Ii = j.requestAnimationFrame) || hr)(ur)), e.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), Ft = V = null;
}, j.__c = function(t, e) {
  e.some(function(i) {
    try {
      i.__h.forEach(Et), i.__h = i.__h.filter(function(n) {
        return !n.__ || Qt(n);
      });
    } catch (n) {
      e.some(function(r) {
        r.__h && (r.__h = []);
      }), e = [], j.__e(n, i.__v);
    }
  }), Oi && Oi(t, e);
}, j.unmount = function(t) {
  Pi && Pi(t);
  var e, i = t.__c;
  i && i.__H && (i.__H.__.forEach(function(n) {
    try {
      Et(n);
    } catch (r) {
      e = r;
    }
  }), i.__H = void 0, e && j.__e(e, i.__v));
};
var Li = typeof requestAnimationFrame == "function";
function hr(t) {
  var e, i = function() {
    clearTimeout(n), Li && cancelAnimationFrame(e), setTimeout(t);
  }, n = setTimeout(i, 35);
  Li && (e = requestAnimationFrame(i));
}
function Et(t) {
  var e = V, i = t.__c;
  typeof i == "function" && (t.__c = void 0, i()), V = e;
}
function Qt(t) {
  var e = V;
  t.__c = t.__(), V = e;
}
function ci(t, e) {
  return !t || t.length !== e.length || e.some(function(i, n) {
    return i !== t[n];
  });
}
function xn(t, e) {
  return typeof e == "function" ? e(t) : e;
}
function Pt({ block: t, onNext: e, onBack: i, onDismiss: n, onAction: r, isFirstStep: o, isLastStep: l, onPollChange: a, totalPollsInStep: d }) {
  const { type: u, settings: h } = t, c = (d ?? 1) > 1, [f, m] = E(null), [y, b] = E(""), [x, C] = E(!1), [g, A] = E(null), O = { fontFamily: v.fontFamily };
  switch (u) {
    case "text":
      const P = h.themeStyle === "title";
      return /* @__PURE__ */ s("div", { style: {
        ...O,
        fontSize: P ? "22px" : "15px",
        fontWeight: P ? 700 : 400,
        color: P ? v.text : v.textMuted,
        lineHeight: 1.4,
        margin: P ? "0 0 12px 0" : "0 0 8px 0",
        textAlign: "center"
      }, children: h.content });
    case "poll-scale":
      const M = h.minValue ?? 1, G = h.maxValue ?? 5, L = Array.from({ length: G - M + 1 }, (k, H) => M + H);
      return /* @__PURE__ */ s("div", { style: { ...O, display: "flex", flexDirection: "column", gap: "16px", padding: "12px 0" }, children: [
        h.question && /* @__PURE__ */ s("h3", { style: { fontSize: "18px", fontWeight: 700, textAlign: "center", margin: 0, color: v.text }, children: h.question }),
        /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px" }, children: L.map((k) => /* @__PURE__ */ s("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }, children: [
          /* @__PURE__ */ s(
            "button",
            {
              onClick: () => m(k),
              style: {
                width: "100%",
                aspectRatio: "1/1",
                maxWidth: "50px",
                borderRadius: "12px",
                border: `1.5px solid ${f === k ? v.primary : "#E2E8F0"}`,
                backgroundColor: f === k ? `${v.primary}15` : "#F8FAFC",
                color: f === k ? v.primary : "#64748B",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              children: k
            }
          ),
          h.showLabels && h.labels?.[k] && /* @__PURE__ */ s("span", { style: { fontSize: "10px", fontWeight: 600, color: f === k ? v.primary : "#94a3b8", textAlign: "center" }, children: h.labels[k] })
        ] }, k)) }),
        /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ s(
          "button",
          {
            disabled: f === null || x,
            onClick: () => {
              a?.(t.id, t.type, h.question || "", String(f)), C(!0), c || setTimeout(() => e(), 600);
            },
            style: {
              backgroundColor: x ? "#16a34a" : f === null ? "#94a3b8" : "#222",
              color: "#fff",
              padding: "12px 40px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: f === null || x ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "background-color 0.2s"
            },
            children: x ? "✓ Submitted" : h.submitLabel || "Submit"
          }
        ) })
      ] });
    case "poll-text":
      return /* @__PURE__ */ s("div", { style: { ...O, display: "flex", flexDirection: "column", gap: "20px", padding: "12px 0" }, children: [
        h.question && /* @__PURE__ */ s("h3", { style: {
          fontSize: h.themeStyle === "title" ? "20px" : h.themeStyle === "sub-title" ? "16px" : "14px",
          fontWeight: h.themeStyle === "body" ? 500 : 700,
          textAlign: "center",
          margin: 0,
          color: "#222222",
          lineHeight: 1.2
        }, children: h.question }),
        /* @__PURE__ */ s("div", { style: { width: "100%" }, children: /* @__PURE__ */ s(
          "textarea",
          {
            value: y,
            placeholder: h.placeholder || "Enter text here...",
            onInput: (k) => b(k.target.value),
            style: {
              ...O,
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
            disabled: !y.trim() || x,
            onClick: () => {
              a?.(t.id, t.type, h.question || "", y.trim()), C(!0), c || setTimeout(() => e(), 600);
            },
            style: {
              backgroundColor: x ? "#16a34a" : y.trim() ? "#222222" : "#94a3b8",
              color: "#fff",
              padding: "12px 40px",
              borderRadius: "12px",
              border: "none",
              fontWeight: 700,
              fontSize: "14px",
              cursor: !y.trim() || x ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transition: "background-color 0.2s"
            },
            children: x ? "✓ Submitted" : h.submitLabel || "Submit"
          }
        ) })
      ] });
    case "poll-yes-no":
      return /* @__PURE__ */ s("div", { style: { ...O, display: "flex", flexDirection: "column", gap: "20px", padding: "12px 0" }, children: [
        h.question && /* @__PURE__ */ s("h3", { style: { fontSize: "18px", fontWeight: 700, textAlign: "center", margin: 0, color: "#222222", lineHeight: 1.2 }, children: h.question }),
        /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "center", gap: "12px" }, children: ["yes", "no"].map((k) => {
          const H = g === k;
          return /* @__PURE__ */ s(
            "button",
            {
              disabled: g !== null,
              onClick: () => {
                a?.(t.id, t.type, h.question || "", k), A(k), c || setTimeout(() => e(), 400);
              },
              style: {
                flex: 1,
                maxWidth: "120px",
                backgroundColor: H ? "#16a34a" : "#222222",
                color: "#fff",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "14px",
                cursor: g !== null ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                opacity: g !== null && g !== k ? 0.4 : 1,
                transition: "background-color 0.2s, opacity 0.2s"
              },
              children: H ? `✓ ${k === "yes" ? h.yesLabel || "Yes" : h.noLabel || "No"}` : k === "yes" ? h.yesLabel || "Yes" : h.noLabel || "No"
            },
            k
          );
        }) })
      ] });
    case "button":
      const U = (h.label || "").toLowerCase(), B = h.action || "next";
      return /* @__PURE__ */ s("div", { style: { display: "flex", gap: "12px", width: "100%", margin: "8px 0" }, children: [
        B === "next" && !o && /* @__PURE__ */ s(
          "button",
          {
            onClick: i,
            style: {
              flex: 1,
              padding: "12px 24px",
              borderRadius: "10px",
              border: `1.5px solid ${v.border}`,
              backgroundColor: "transparent",
              color: v.text,
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
              B === "next" ? e() : B === "dismiss" ? n() : B === "url" && h.url && r(h.url);
            },
            style: {
              flex: 2,
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: v.primary,
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)"
            },
            children: h.label || (l ? "Finish" : "Next")
          }
        )
      ] });
    case "image":
      return /* @__PURE__ */ s("div", { style: { width: "100%", backgroundColor: "#f1f5f9", display: "flex", justifyContent: "center", margin: "0 0 16px 0" }, children: /* @__PURE__ */ s(
        "img",
        {
          src: h.url,
          alt: "Guide Media",
          style: { width: "100%", maxHeight: "300px", objectFit: "cover" }
        }
      ) });
    case "video":
      return /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", paddingTop: "56.25%", margin: "0 0 16px 0" }, children: /* @__PURE__ */ s(
        "iframe",
        {
          src: h.url,
          style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" },
          allowFullScreen: !0
        }
      ) });
    case "horizontal-line":
      return /* @__PURE__ */ s("hr", { style: { border: "none", borderTop: `1px solid ${v.border}`, margin: "16px 0" } });
    default:
      return null;
  }
}
function fr({
  content: t,
  onDismiss: e,
  onNext: i,
  onBack: n,
  onAction: r,
  isFirstStep: o,
  isLastStep: l,
  onPollChange: a
}) {
  const d = we(() => {
    try {
      return JSON.parse(t);
    } catch {
      return { title: "Untitled" };
    }
  }, [t]), u = we(() => {
    const c = d.layout || {}, f = {
      center: ["center", "center"],
      top: ["flex-start", "center"],
      bottom: ["flex-end", "center"],
      "top-left": ["flex-start", "flex-start"],
      "top-right": ["flex-start", "flex-end"],
      "bottom-left": ["flex-end", "flex-start"],
      "bottom-right": ["flex-end", "flex-end"]
    };
    let m = "center", y = "center";
    if (c.position && f[c.position])
      [m, y] = f[c.position];
    else if (c.verticalAlignment || c.horizontalAlignment) {
      const b = { top: "flex-start", center: "center", bottom: "flex-end" }, x = { left: "flex-start", center: "center", right: "flex-end" };
      m = b[c.verticalAlignment || "center"] ?? "center", y = x[c.horizontalAlignment || "center"] ?? "center";
    }
    return {
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: m,
      justifyContent: y,
      backgroundColor: d.backdropColor || "rgba(0, 0, 0, 0.5)",
      zIndex: v.zIndex.guides,
      pointerEvents: "auto",
      padding: "40px",
      // Prevent sticking to edges
      backdropFilter: "blur(2px)",
      transition: "all 0.3s ease-out"
    };
  }, [d]);
  return /* @__PURE__ */ s(
    "div",
    {
      className: "designer-guide-modal-overlay",
      onClick: (c) => {
        c.target === c.currentTarget && d.backdropDismiss !== !1 && e();
      },
      style: u,
      children: [
        /* @__PURE__ */ s(
          "div",
          {
            className: "designer-guide-modal-card",
            style: {
              position: "relative",
              width: "90%",
              maxWidth: "500px",
              backgroundColor: v.bg,
              borderRadius: "16px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              fontFamily: v.fontFamily,
              animation: "designer-modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            },
            onClick: (c) => c.stopPropagation(),
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
              /* @__PURE__ */ s("div", { style: { padding: "24px" }, children: d.blocks && d.blocks.length > 0 ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column" }, children: (() => {
                const c = d.blocks.filter((f) => f.type.startsWith("poll-")).length;
                return d.blocks.map((f) => /* @__PURE__ */ s(
                  Pt,
                  {
                    block: f,
                    onNext: i,
                    onBack: n,
                    onDismiss: e,
                    onAction: r,
                    isFirstStep: o,
                    isLastStep: l,
                    onPollChange: a,
                    totalPollsInStep: c
                  },
                  f.id
                ));
              })() }) : (
                /* Fallback Legacy Rendering */
                /* @__PURE__ */ s("div", { style: { textAlign: "center" }, children: [
                  /* @__PURE__ */ s("h2", { style: { margin: "0 0 12px 0", fontSize: "22px", fontWeight: 700, color: v.text }, children: d.title }),
                  d.body && /* @__PURE__ */ s("p", { style: { margin: 0, fontSize: "15px", color: v.textMuted }, children: d.body }),
                  /* @__PURE__ */ s("div", { style: { display: "flex", gap: "12px", marginTop: "24px" }, children: [
                    !o && /* @__PURE__ */ s(
                      "button",
                      {
                        onClick: n,
                        style: {
                          flex: 1,
                          padding: "12px 24px",
                          borderRadius: "10px",
                          border: `1.5px solid ${v.border}`,
                          backgroundColor: "transparent",
                          color: v.text,
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
                          backgroundColor: v.primary,
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
const Sn = "Template", wn = "Description", pr = "Next";
function mr(t) {
  try {
    return JSON.parse(t || "{}");
  } catch {
    return { title: Sn, description: wn };
  }
}
const gr = {
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  paddingTop: 24,
  paddingRight: 16,
  paddingBottom: 24,
  paddingLeft: 16,
  fontFamily: v.fontFamily
};
function yr({
  title: t = Sn,
  description: e = wn,
  buttonContent: i = pr,
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
          onClick: (l) => {
            l.stopPropagation(), r?.();
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
          onClick: (l) => {
            l.stopPropagation(), n?.();
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
function _r({ template: t, top: e, left: i, onDismiss: n, onNext: r, onBack: o, isFirstStep: l, isLastStep: a, onPollChange: d }) {
  const u = we(() => mr(de(t)), [t]), c = t.template.template_key === "tooltip-scratch";
  return /* @__PURE__ */ s(
    "div",
    {
      style: {
        position: "absolute",
        top: `${e}px`,
        left: `${i}px`,
        zIndex: v.zIndex.tooltip,
        pointerEvents: "auto",
        maxWidth: 300,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "top, left"
      },
      children: /* @__PURE__ */ s("div", { style: { position: "relative", width: "100%", margin: "0 auto", paddingTop: c ? 12 : 0 }, children: [
        c && /* @__PURE__ */ s(
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
        /* @__PURE__ */ s("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 8, ...gr }, children: [
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
          u.blocks && u.blocks.length > 0 ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column" }, children: (() => {
            const f = u.blocks.filter((m) => m.type.startsWith("poll-")).length;
            return u.blocks.map((m) => /* @__PURE__ */ s(
              Pt,
              {
                block: m,
                onNext: r,
                onBack: o,
                onDismiss: n,
                onAction: (y) => window.open(y, "_blank"),
                isFirstStep: l,
                isLastStep: a,
                onPollChange: d,
                totalPollsInStep: f
              },
              m.id
            ));
          })() }) : /* @__PURE__ */ s(
            yr,
            {
              title: u.title,
              description: u.description,
              buttonContent: u.buttonContent,
              onNext: r,
              onBack: o,
              isFirstStep: l
            }
          )
        ] })
      ] })
    }
  );
}
function vr({
  content: t,
  onDismiss: e,
  onNext: i,
  onBack: n,
  onAction: r,
  isFirstStep: o,
  isLastStep: l,
  onPollChange: a
}) {
  const d = we(() => {
    try {
      return JSON.parse(t);
    } catch {
      return {};
    }
  }, [t]), u = d.layout?.position === "bottom" ? "bottom" : "top", h = {
    position: "fixed",
    [u]: 0,
    left: 0,
    width: "100%",
    background: "#ffffff",
    borderTop: u === "bottom" ? `3px solid ${v.primary}` : "none",
    borderBottom: u === "top" ? `3px solid ${v.primary}` : "none",
    boxShadow: u === "top" ? "0 4px 16px rgba(0,0,0,0.10)" : "0 -4px 16px rgba(0,0,0,0.10)",
    zIndex: v.zIndex.guides,
    fontFamily: v.fontFamily,
    animation: u === "top" ? "banner-slide-down 0.3s ease" : "banner-slide-up 0.3s ease",
    pointerEvents: "auto"
  }, c = d.blocks ?? [], f = c.filter((m) => m.type.startsWith("poll-")).length;
  return /* @__PURE__ */ s(X, { children: [
    /* @__PURE__ */ s("style", { children: `
        @keyframes banner-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes banner-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      ` }),
    /* @__PURE__ */ s("div", { style: h, children: /* @__PURE__ */ s("div", { style: {
      maxWidth: "960px",
      margin: "0 auto",
      padding: "12px 48px 12px 20px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
      position: "relative"
    }, children: [
      c.length > 0 ? c.map((m) => /* @__PURE__ */ s("div", { style: { flex: m.type === "button" ? "0 0 auto" : "1 1 auto", minWidth: 0 }, children: /* @__PURE__ */ s(
        Pt,
        {
          block: m,
          onNext: i,
          onBack: n,
          onDismiss: e,
          onAction: r,
          isFirstStep: o,
          isLastStep: l,
          onPollChange: a,
          totalPollsInStep: f
        }
      ) }, m.id)) : /* @__PURE__ */ s("span", { style: { fontSize: "14px", color: v.textMuted, fontFamily: v.fontFamily }, children: "Banner — add blocks to show content" }),
      /* @__PURE__ */ s(
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
          children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "16px" } })
        }
      )
    ] }) })
  ] });
}
function br({ targetRect: t }) {
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
        zIndex: v.zIndex.overlay,
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
function xr(t) {
  const e = { position: "absolute" };
  switch (t) {
    case "top":
      return { ...e, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${v.primary} transparent transparent transparent` };
    case "bottom":
      return { ...e, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${v.primary} transparent` };
    case "left":
      return { ...e, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${v.primary}` };
    default:
      return { ...e, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${v.primary} transparent transparent` };
  }
}
function Fi(t, e, i, n) {
  const r = t.getBoundingClientRect();
  let o = 0, l = 0;
  switch (e) {
    case "top":
      o = r.top - n - 12, l = r.left + r.width / 2 - i / 2;
      break;
    case "bottom":
      o = r.bottom + 12, l = r.left + r.width / 2 - i / 2;
      break;
    case "left":
      o = r.top + r.height / 2 - n / 2, l = r.left - i - 12;
      break;
    default:
      o = r.top + r.height / 2 - n / 2, l = r.right + 12;
      break;
  }
  const a = window.innerWidth, d = window.innerHeight;
  return l < 10 ? l = 10 : l + i > a - 10 && (l = a - i - 10), o < 10 ? o = 10 : o + n > d - 10 && (o = d - n - 10), { top: o, left: l, arrowStyle: xr(e) };
}
class Sr {
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
  setOnDismiss(e) {
    this.onDismiss = e;
  }
  setOnNext(e) {
    this.onNext = e;
  }
  setOnPollResponse(e) {
    this.onPollResponse = e;
  }
  firePollResponse(e, i, n, r) {
    if (!this.triggeredGuide) return;
    const a = [...(this.triggeredGuide.templates || []).filter((d) => d.is_active)].sort((d, u) => d.step_order - u.step_order)[this.currentStepIndex];
    a && this.onPollResponse(this.triggeredGuide, a.template_id, e, i, n, r, this.currentStepIndex);
  }
  renderGuides(e) {
    this.lastGuides = e;
    const i = Ge(), n = e.filter(
      (c) => c.page === i && c.status === "active" && !this.dismissedThisSession.has(c.id)
    );
    if (this.ensureContainer(), !this.container) return;
    const r = [], o = [];
    for (const c of n) {
      const f = Se.findElement(c.selector);
      if (!f) continue;
      Lt(f);
      const m = Fi(f, c.placement, 280, 80);
      r.push({ guide: c, target: f, pos: m });
    }
    if (this.triggeredGuide && !this.dismissedThisSession.has(this.triggeredGuide.guide_id)) {
      const m = [...(this.triggeredGuide.templates || []).filter((y) => y.is_active)].sort((y, b) => y.step_order - b.step_order)[this.currentStepIndex];
      if (m && m.x_path) {
        const y = Se.findElement(m.x_path);
        if (y) {
          Lt(y);
          const b = Fi(y, "bottom", 300, 160), x = y.getBoundingClientRect(), C = x.left + x.width / 2;
          b.left = C - 16 - 16;
          const g = window.innerWidth;
          b.left < 10 ? b.left = 10 : b.left + 300 > g - 10 && (b.left = g - 300 - 10), o.push({ template: m, target: y, pos: b, targetRect: x });
        } else
          console.warn(`[Visual Designer] Target element not found for template "${m.template_id}" using selector: ${m.x_path}`);
      }
    }
    const a = [...(this.triggeredGuide?.templates || []).filter((c) => c.is_active)].sort((c, f) => c.step_order - f.step_order), d = a[this.currentStepIndex], u = !!d && !d.x_path && (() => {
      try {
        return JSON.parse(de(d)).layout?.renderAs === "banner";
      } catch {
        return !1;
      }
    })(), h = !u && !d?.x_path;
    if (r.length === 0 && o.length === 0 && !d) {
      Le(null, this.container);
      return;
    }
    Le(
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
            zIndex: v.zIndex.guides,
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          },
          children: [
            o.length > 0 && /* @__PURE__ */ s(br, { targetRect: o[0].targetRect }),
            r.map(({ guide: c, pos: f }) => /* @__PURE__ */ s(
              ar,
              {
                guide: c,
                top: f.top,
                left: f.left,
                arrowStyle: f.arrowStyle,
                onDismiss: () => this.dismissGuide(c.id)
              },
              c.id
            )),
            o.map(({ template: c, pos: f }) => /* @__PURE__ */ s(
              _r,
              {
                template: c,
                top: f.top,
                left: f.left,
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (m, y, b, x) => this.firePollResponse(m, y, b, x)
              },
              this.triggeredGuide.guide_id
            )),
            u && d && /* @__PURE__ */ s(
              vr,
              {
                content: de(d),
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                onAction: (c) => window.location.href = c,
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (c, f, m, y) => this.firePollResponse(c, f, m, y)
              },
              `${this.triggeredGuide.guide_id}-${this.currentStepIndex}`
            ),
            h && d && /* @__PURE__ */ s(
              fr,
              {
                content: de(d),
                onDismiss: () => this.dismissTriggeredGuide(),
                onNext: () => this.handleNext(),
                onBack: () => this.handleBack(),
                onAction: (c) => window.location.href = c,
                isFirstStep: this.currentStepIndex === 0,
                isLastStep: this.currentStepIndex === a.length - 1,
                onPollChange: (c, f, m, y) => this.firePollResponse(c, f, m, y)
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
    const r = [...(e.templates || []).filter((o) => o.is_active)].sort((o, l) => o.step_order - l.step_order)[0];
    if (r && r.x_path)
      try {
        await Se.waitForElement(r.x_path);
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
      const r = Se.findElement(n.x_path);
      r && Lt(r);
    }
    this.renderGuides(this.lastGuides);
  }
  async handleNext() {
    if (!this.triggeredGuide) return;
    const i = [...(this.triggeredGuide.templates || []).filter((r) => r.is_active)].sort((r, o) => r.step_order - o.step_order), n = i[this.currentStepIndex];
    if (this.onNext(this.triggeredGuide, this.currentStepIndex, i.length), n && n.auto_click_target && n.x_path) {
      console.log(`[Visual Designer] Auto-clicking target element for step: ${n.template_id}`);
      const r = Se.findElement(n.x_path);
      r instanceof HTMLElement ? r.click() : r && r.click?.();
    }
    if (this.currentStepIndex < i.length - 1) {
      this.currentStepIndex++;
      const r = i[this.currentStepIndex];
      if (r && r.x_path)
        try {
          this.renderGuides(this.lastGuides), await Se.waitForElement(r.x_path);
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
    this.dismissedThisSession.clear(), this.container && Le(null, this.container);
  }
  clearTriggeredGuide() {
    this.triggeredGuide = null, this.currentStepIndex = 0, this.container && Le(null, this.container);
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
      this.container = document.createElement("div"), this.container.id = "designer-guides-root", this.container.style.position = "fixed", this.container.style.top = "0", this.container.style.left = "0", this.container.style.width = "100vw", this.container.style.height = "100vh", this.container.style.pointerEvents = "none", this.container.style.zIndex = String(v.zIndex.guides), document.body.appendChild(this.container);
    }
  }
}
const Di = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function wr({ feature: t, color: e, rect: i }) {
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
        zIndex: v.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${e}`
      }
    }
  );
}
class Er {
  container = null;
  lastEnabled = !1;
  render(e, i) {
    if (this.lastEnabled = i, this.clear(), !i || e.length === 0) return;
    const n = e.filter((o) => (o.selector || "").trim() !== "");
    if (this.ensureContainer(), !this.container) return;
    const r = n.map((o, l) => {
      const a = Se.findElement(o.selector);
      if (!a) return null;
      const d = a.getBoundingClientRect(), u = Di[l % Di.length];
      return { feature: o, rect: d, color: u };
    }).filter(Boolean);
    r.length !== 0 && Le(
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
            zIndex: v.zIndex.overlay - 1
          },
          children: r.map(({ feature: o, rect: l, color: a }) => /* @__PURE__ */ s(
            wr,
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
    this.container && Le(null, this.container);
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
var Xe = class {
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
}, Cr = {
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
}, Ir = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = Cr;
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
}, We = new Ir();
function kr(t) {
  setTimeout(t, 0);
}
var $e = typeof window > "u" || "Deno" in globalThis;
function se() {
}
function Tr(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function jt(t) {
  return typeof t == "number" && t >= 0 && t !== 1 / 0;
}
function En(t, e) {
  return Math.max(t + (e || 0) - Date.now(), 0);
}
function Fe(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function fe(t, e) {
  return typeof t == "function" ? t(e) : t;
}
function zi(t, e) {
  const {
    type: i = "all",
    exact: n,
    fetchStatus: r,
    predicate: o,
    queryKey: l,
    stale: a
  } = t;
  if (l) {
    if (n) {
      if (e.queryHash !== di(l, e.options))
        return !1;
    } else if (!lt(e.queryKey, l))
      return !1;
  }
  if (i !== "all") {
    const d = e.isActive();
    if (i === "active" && !d || i === "inactive" && d)
      return !1;
  }
  return !(typeof a == "boolean" && e.isStale() !== a || r && r !== e.state.fetchStatus || o && !o(e));
}
function Mi(t, e) {
  const { exact: i, status: n, predicate: r, mutationKey: o } = t;
  if (o) {
    if (!e.options.mutationKey)
      return !1;
    if (i) {
      if (Ve(e.options.mutationKey) !== Ve(o))
        return !1;
    } else if (!lt(e.options.mutationKey, o))
      return !1;
  }
  return !(n && e.state.status !== n || r && !r(e));
}
function di(t, e) {
  return (e?.queryKeyHashFn || Ve)(t);
}
function Ve(t) {
  return JSON.stringify(
    t,
    (e, i) => Yt(i) ? Object.keys(i).sort().reduce((n, r) => (n[r] = i[r], n), {}) : i
  );
}
function lt(t, e) {
  return t === e ? !0 : typeof t != typeof e ? !1 : t && e && typeof t == "object" && typeof e == "object" ? Object.keys(e).every((i) => lt(t[i], e[i])) : !1;
}
var Rr = Object.prototype.hasOwnProperty;
function Cn(t, e, i = 0) {
  if (t === e)
    return t;
  if (i > 500) return e;
  const n = Ni(t) && Ni(e);
  if (!n && !(Yt(t) && Yt(e))) return e;
  const o = (n ? t : Object.keys(t)).length, l = n ? e : Object.keys(e), a = l.length, d = n ? new Array(a) : {};
  let u = 0;
  for (let h = 0; h < a; h++) {
    const c = n ? h : l[h], f = t[c], m = e[c];
    if (f === m) {
      d[c] = f, (n ? h < o : Rr.call(t, c)) && u++;
      continue;
    }
    if (f === null || m === null || typeof f != "object" || typeof m != "object") {
      d[c] = m;
      continue;
    }
    const y = Cn(f, m, i + 1);
    d[c] = y, y === f && u++;
  }
  return o === a && u === o ? t : d;
}
function Tt(t, e) {
  if (!e || Object.keys(t).length !== Object.keys(e).length)
    return !1;
  for (const i in t)
    if (t[i] !== e[i])
      return !1;
  return !0;
}
function Ni(t) {
  return Array.isArray(t) && t.length === Object.keys(t).length;
}
function Yt(t) {
  if (!Bi(t))
    return !1;
  const e = t.constructor;
  if (e === void 0)
    return !0;
  const i = e.prototype;
  return !(!Bi(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(t) !== Object.prototype);
}
function Bi(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function Or(t) {
  return new Promise((e) => {
    We.setTimeout(e, t);
  });
}
function Xt(t, e, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(t, e) : i.structuralSharing !== !1 ? Cn(t, e) : e;
}
function Pr(t, e, i = 0) {
  const n = [...t, e];
  return i && n.length > i ? n.slice(1) : n;
}
function Ar(t, e, i = 0) {
  const n = [e, ...t];
  return i && n.length > i ? n.slice(0, -1) : n;
}
var ui = /* @__PURE__ */ Symbol();
function In(t, e) {
  return !t.queryFn && e?.initialPromise ? () => e.initialPromise : !t.queryFn || t.queryFn === ui ? () => Promise.reject(new Error(`Missing queryFn: '${t.queryHash}'`)) : t.queryFn;
}
function hi(t, e) {
  return typeof t == "function" ? t(...e) : !!t;
}
function Lr(t, e, i) {
  let n = !1, r;
  return Object.defineProperty(t, "signal", {
    enumerable: !0,
    get: () => (r ??= e(), n || (n = !0, r.aborted ? i() : r.addEventListener("abort", i, { once: !0 })), r)
  }), t;
}
var Fr = class extends Xe {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!$e && window.addEventListener) {
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
}, fi = new Fr();
function Jt() {
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
var Dr = kr;
function zr() {
  let t = [], e = 0, i = (a) => {
    a();
  }, n = (a) => {
    a();
  }, r = Dr;
  const o = (a) => {
    e ? t.push(a) : r(() => {
      i(a);
    });
  }, l = () => {
    const a = t;
    t = [], a.length && r(() => {
      n(() => {
        a.forEach((d) => {
          i(d);
        });
      });
    });
  };
  return {
    batch: (a) => {
      let d;
      e++;
      try {
        d = a();
      } finally {
        e--, e || l();
      }
      return d;
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: (a) => (...d) => {
      o(() => {
        a(...d);
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
      n = a;
    },
    setScheduler: (a) => {
      r = a;
    }
  };
}
var J = zr(), Mr = class extends Xe {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (t) => {
      if (!$e && window.addEventListener) {
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
}, Rt = new Mr();
function Nr(t) {
  return Math.min(1e3 * 2 ** t, 3e4);
}
function kn(t) {
  return (t ?? "online") === "online" ? Rt.isOnline() : !0;
}
var Zt = class extends Error {
  constructor(t) {
    super("CancelledError"), this.revert = t?.revert, this.silent = t?.silent;
  }
};
function Tn(t) {
  let e = !1, i = 0, n;
  const r = Jt(), o = () => r.status !== "pending", l = (b) => {
    if (!o()) {
      const x = new Zt(b);
      f(x), t.onCancel?.(x);
    }
  }, a = () => {
    e = !0;
  }, d = () => {
    e = !1;
  }, u = () => fi.isFocused() && (t.networkMode === "always" || Rt.isOnline()) && t.canRun(), h = () => kn(t.networkMode) && t.canRun(), c = (b) => {
    o() || (n?.(), r.resolve(b));
  }, f = (b) => {
    o() || (n?.(), r.reject(b));
  }, m = () => new Promise((b) => {
    n = (x) => {
      (o() || u()) && b(x);
    }, t.onPause?.();
  }).then(() => {
    n = void 0, o() || t.onContinue?.();
  }), y = () => {
    if (o())
      return;
    let b;
    const x = i === 0 ? t.initialPromise : void 0;
    try {
      b = x ?? t.fn();
    } catch (C) {
      b = Promise.reject(C);
    }
    Promise.resolve(b).then(c).catch((C) => {
      if (o())
        return;
      const g = t.retry ?? ($e ? 0 : 3), A = t.retryDelay ?? Nr, O = typeof A == "function" ? A(i, C) : A, P = g === !0 || typeof g == "number" && i < g || typeof g == "function" && g(i, C);
      if (e || !P) {
        f(C);
        return;
      }
      i++, t.onFail?.(i, C), Or(O).then(() => u() ? void 0 : m()).then(() => {
        e ? f(C) : y();
      });
    });
  };
  return {
    promise: r,
    status: () => r.status,
    cancel: l,
    continue: () => (n?.(), r),
    cancelRetry: a,
    continueRetry: d,
    canStart: h,
    start: () => (h() ? y() : m().then(y), r)
  };
}
var Rn = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), jt(this.gcTime) && (this.#e = We.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(t) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      t ?? ($e ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (We.clearTimeout(this.#e), this.#e = void 0);
  }
}, Br = class extends Rn {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(t) {
    super(), this.#a = !1, this.#o = t.defaultOptions, this.setOptions(t.options), this.observers = [], this.#r = t.client, this.#i = this.#r.getQueryCache(), this.queryKey = t.queryKey, this.queryHash = t.queryHash, this.#e = Wi(this.options), this.state = t.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(t) {
    if (this.options = { ...this.#o, ...t }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const e = Wi(this.options);
      e.data !== void 0 && (this.setState(
        Ui(e.data, e.dataUpdatedAt)
      ), this.#e = e);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(t, e) {
    const i = Xt(this.state.data, t, this.options);
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
    return this.#n?.cancel(t), e ? e.then(se).catch(se) : Promise.resolve();
  }
  destroy() {
    super.destroy(), this.cancel({ silent: !0 });
  }
  reset() {
    this.destroy(), this.setState(this.#e);
  }
  isActive() {
    return this.observers.some(
      (t) => fe(t.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === ui || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => Fe(t.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (t) => t.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(t = 0) {
    return this.state.data === void 0 ? !0 : t === "static" ? !1 : this.state.isInvalidated ? !0 : !En(this.state.dataUpdatedAt, t);
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
      const a = this.observers.find((d) => d.options.queryFn);
      a && this.setOptions(a.options);
    }
    const i = new AbortController(), n = (a) => {
      Object.defineProperty(a, "signal", {
        enumerable: !0,
        get: () => (this.#a = !0, i.signal)
      });
    }, r = () => {
      const a = In(this.options, e), u = (() => {
        const h = {
          client: this.#r,
          queryKey: this.queryKey,
          meta: this.meta
        };
        return n(h), h;
      })();
      return this.#a = !1, this.options.persister ? this.options.persister(
        a,
        u,
        this
      ) : a(u);
    }, l = (() => {
      const a = {
        fetchOptions: e,
        options: this.options,
        queryKey: this.queryKey,
        client: this.#r,
        state: this.state,
        fetchFn: r
      };
      return n(a), a;
    })();
    this.options.behavior?.onFetch(l, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== l.fetchOptions?.meta) && this.#s({ type: "fetch", meta: l.fetchOptions?.meta }), this.#n = Tn({
      initialPromise: e?.initialPromise,
      fn: l.fetchFn,
      onCancel: (a) => {
        a instanceof Zt && a.revert && this.setState({
          ...this.#t,
          fetchStatus: "idle"
        }), i.abort();
      },
      onFail: (a, d) => {
        this.#s({ type: "failed", failureCount: a, error: d });
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
      if (a instanceof Zt) {
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
            ...On(i.data, this.options),
            fetchMeta: t.meta ?? null
          };
        case "success":
          const n = {
            ...i,
            ...Ui(t.data, t.dataUpdatedAt),
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
    this.state = e(this.state), J.batch(() => {
      this.observers.forEach((i) => {
        i.onQueryUpdate();
      }), this.#i.notify({ query: this, type: "updated", action: t });
    });
  }
};
function On(t, e) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: kn(e.networkMode) ? "fetching" : "paused",
    ...t === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function Ui(t, e) {
  return {
    data: t,
    dataUpdatedAt: e ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function Wi(t) {
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
var Ur = class extends Xe {
  constructor(t, e) {
    super(), this.options = e, this.#e = t, this.#s = null, this.#a = Jt(), this.bindMethods(), this.setOptions(e);
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
    this.listeners.size === 1 && (this.#t.addObserver(this), Gi(this.#t, this.options) ? this.#u() : this.updateResult(), this.#v());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return ei(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return ei(
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
    if (this.options = this.#e.defaultQueryOptions(t), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof fe(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), e._defaulted && !Tt(this.options, e) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const n = this.hasListeners();
    n && Hi(
      this.#t,
      i,
      this.options,
      e
    ) && this.#u(), this.updateResult(), n && (this.#t !== i || fe(this.options.enabled, this.#t) !== fe(e.enabled, this.#t) || Fe(this.options.staleTime, this.#t) !== Fe(e.staleTime, this.#t)) && this.#g();
    const r = this.#y();
    n && (this.#t !== i || fe(this.options.enabled, this.#t) !== fe(e.enabled, this.#t) || r !== this.#l) && this.#_(r);
  }
  getOptimisticResult(t) {
    const e = this.#e.getQueryCache().build(this.#e, t), i = this.createResult(e, t);
    return Gr(this, i) && (this.#r = i, this.#o = this.options, this.#n = this.#t.state), i;
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
    return t?.throwOnError || (e = e.catch(se)), e;
  }
  #g() {
    this.#b();
    const t = Fe(
      this.options.staleTime,
      this.#t
    );
    if ($e || this.#r.isStale || !jt(t))
      return;
    const i = En(this.#r.dataUpdatedAt, t) + 1;
    this.#c = We.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(t) {
    this.#x(), this.#l = t, !($e || fe(this.options.enabled, this.#t) === !1 || !jt(this.#l) || this.#l === 0) && (this.#d = We.setInterval(() => {
      (this.options.refetchIntervalInBackground || fi.isFocused()) && this.#u();
    }, this.#l));
  }
  #v() {
    this.#g(), this.#_(this.#y());
  }
  #b() {
    this.#c && (We.clearTimeout(this.#c), this.#c = void 0);
  }
  #x() {
    this.#d && (We.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(t, e) {
    const i = this.#t, n = this.options, r = this.#r, o = this.#n, l = this.#o, d = t !== i ? t.state : this.#i, { state: u } = t;
    let h = { ...u }, c = !1, f;
    if (e._optimisticResults) {
      const L = this.hasListeners(), U = !L && Gi(t, e), B = L && Hi(t, i, e, n);
      (U || B) && (h = {
        ...h,
        ...On(u.data, t.options)
      }), e._optimisticResults === "isRestoring" && (h.fetchStatus = "idle");
    }
    let { error: m, errorUpdatedAt: y, status: b } = h;
    f = h.data;
    let x = !1;
    if (e.placeholderData !== void 0 && f === void 0 && b === "pending") {
      let L;
      r?.isPlaceholderData && e.placeholderData === l?.placeholderData ? (L = r.data, x = !0) : L = typeof e.placeholderData == "function" ? e.placeholderData(
        this.#f?.state.data,
        this.#f
      ) : e.placeholderData, L !== void 0 && (b = "success", f = Xt(
        r?.data,
        L,
        e
      ), c = !0);
    }
    if (e.select && f !== void 0 && !x)
      if (r && f === o?.data && e.select === this.#m)
        f = this.#h;
      else
        try {
          this.#m = e.select, f = e.select(f), f = Xt(r?.data, f, e), this.#h = f, this.#s = null;
        } catch (L) {
          this.#s = L;
        }
    this.#s && (m = this.#s, f = this.#h, y = Date.now(), b = "error");
    const C = h.fetchStatus === "fetching", g = b === "pending", A = b === "error", O = g && C, P = f !== void 0, G = {
      status: b,
      fetchStatus: h.fetchStatus,
      isPending: g,
      isSuccess: b === "success",
      isError: A,
      isInitialLoading: O,
      isLoading: O,
      data: f,
      dataUpdatedAt: h.dataUpdatedAt,
      error: m,
      errorUpdatedAt: y,
      failureCount: h.fetchFailureCount,
      failureReason: h.fetchFailureReason,
      errorUpdateCount: h.errorUpdateCount,
      isFetched: h.dataUpdateCount > 0 || h.errorUpdateCount > 0,
      isFetchedAfterMount: h.dataUpdateCount > d.dataUpdateCount || h.errorUpdateCount > d.errorUpdateCount,
      isFetching: C,
      isRefetching: C && !g,
      isLoadingError: A && !P,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: c,
      isRefetchError: A && P,
      isStale: pi(t, e),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: fe(e.enabled, t) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const L = G.data !== void 0, U = G.status === "error" && !L, B = (Z) => {
        U ? Z.reject(G.error) : L && Z.resolve(G.data);
      }, k = () => {
        const Z = this.#a = G.promise = Jt();
        B(Z);
      }, H = this.#a;
      switch (H.status) {
        case "pending":
          t.queryHash === i.queryHash && B(H);
          break;
        case "fulfilled":
          (U || G.data !== H.value) && k();
          break;
        case "rejected":
          (!U || G.error !== H.reason) && k();
          break;
      }
    }
    return G;
  }
  updateResult() {
    const t = this.#r, e = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#f = this.#t), Tt(e, t))
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
    this.updateResult(), this.hasListeners() && this.#v();
  }
  #w(t) {
    J.batch(() => {
      t.listeners && this.listeners.forEach((e) => {
        e(this.#r);
      }), this.#e.getQueryCache().notify({
        query: this.#t,
        type: "observerResultsUpdated"
      });
    });
  }
};
function Wr(t, e) {
  return fe(e.enabled, t) !== !1 && t.state.data === void 0 && !(t.state.status === "error" && e.retryOnMount === !1);
}
function Gi(t, e) {
  return Wr(t, e) || t.state.data !== void 0 && ei(t, e, e.refetchOnMount);
}
function ei(t, e, i) {
  if (fe(e.enabled, t) !== !1 && Fe(e.staleTime, t) !== "static") {
    const n = typeof i == "function" ? i(t) : i;
    return n === "always" || n !== !1 && pi(t, e);
  }
  return !1;
}
function Hi(t, e, i, n) {
  return (t !== e || fe(n.enabled, t) === !1) && (!i.suspense || t.state.status !== "error") && pi(t, i);
}
function pi(t, e) {
  return fe(e.enabled, t) !== !1 && t.isStaleByTime(Fe(e.staleTime, t));
}
function Gr(t, e) {
  return !Tt(t.getCurrentResult(), e);
}
function $i(t) {
  return {
    onFetch: (e, i) => {
      const n = e.options, r = e.fetchOptions?.meta?.fetchMore?.direction, o = e.state.data?.pages || [], l = e.state.data?.pageParams || [];
      let a = { pages: [], pageParams: [] }, d = 0;
      const u = async () => {
        let h = !1;
        const c = (y) => {
          Lr(
            y,
            () => e.signal,
            () => h = !0
          );
        }, f = In(e.options, e.fetchOptions), m = async (y, b, x) => {
          if (h)
            return Promise.reject();
          if (b == null && y.pages.length)
            return Promise.resolve(y);
          const g = (() => {
            const M = {
              client: e.client,
              queryKey: e.queryKey,
              pageParam: b,
              direction: x ? "backward" : "forward",
              meta: e.options.meta
            };
            return c(M), M;
          })(), A = await f(g), { maxPages: O } = e.options, P = x ? Ar : Pr;
          return {
            pages: P(y.pages, A, O),
            pageParams: P(y.pageParams, b, O)
          };
        };
        if (r && o.length) {
          const y = r === "backward", b = y ? Hr : Vi, x = {
            pages: o,
            pageParams: l
          }, C = b(n, x);
          a = await m(x, C, y);
        } else {
          const y = t ?? o.length;
          do {
            const b = d === 0 ? l[0] ?? n.initialPageParam : Vi(n, a);
            if (d > 0 && b == null)
              break;
            a = await m(a, b), d++;
          } while (d < y);
        }
        return a;
      };
      e.options.persister ? e.fetchFn = () => e.options.persister?.(
        u,
        {
          client: e.client,
          queryKey: e.queryKey,
          meta: e.options.meta,
          signal: e.signal
        },
        i
      ) : e.fetchFn = u;
    }
  };
}
function Vi(t, { pages: e, pageParams: i }) {
  const n = e.length - 1;
  return e.length > 0 ? t.getNextPageParam(
    e[n],
    e,
    i[n],
    i
  ) : void 0;
}
function Hr(t, { pages: e, pageParams: i }) {
  return e.length > 0 ? t.getPreviousPageParam?.(e[0], e, i[0], i) : void 0;
}
var $r = class extends Rn {
  #e;
  #t;
  #i;
  #r;
  constructor(t) {
    super(), this.#e = t.client, this.mutationId = t.mutationId, this.#i = t.mutationCache, this.#t = [], this.state = t.state || Pn(), this.setOptions(t.options), this.scheduleGc();
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
    this.#r = Tn({
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
        const l = await this.options.onMutate?.(
          t,
          i
        );
        l !== this.state.context && this.#n({
          type: "pending",
          context: l,
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
    this.state = e(this.state), J.batch(() => {
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
function Pn() {
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
var Vr = class extends Xe {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(t, e, i) {
    const n = new $r({
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
    const e = mt(t);
    if (typeof e == "string") {
      const i = this.#t.get(e);
      i ? i.push(t) : this.#t.set(e, [t]);
    }
    this.notify({ type: "added", mutation: t });
  }
  remove(t) {
    if (this.#e.delete(t)) {
      const e = mt(t);
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
    const e = mt(t);
    if (typeof e == "string") {
      const n = this.#t.get(e)?.find(
        (r) => r.state.status === "pending"
      );
      return !n || n === t;
    } else
      return !0;
  }
  runNext(t) {
    const e = mt(t);
    return typeof e == "string" ? this.#t.get(e)?.find((n) => n !== t && n.state.isPaused)?.continue() ?? Promise.resolve() : Promise.resolve();
  }
  clear() {
    J.batch(() => {
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
      (i) => Mi(e, i)
    );
  }
  findAll(t = {}) {
    return this.getAll().filter((e) => Mi(t, e));
  }
  notify(t) {
    J.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  resumePausedMutations() {
    const t = this.getAll().filter((e) => e.state.isPaused);
    return J.batch(
      () => Promise.all(
        t.map((e) => e.continue().catch(se))
      )
    );
  }
};
function mt(t) {
  return t.options.scope?.id;
}
var Kr = class extends Xe {
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
    this.options = this.#e.defaultMutationOptions(e), Tt(this.options, i) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), i?.mutationKey && this.options.mutationKey && Ve(i.mutationKey) !== Ve(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
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
    const e = this.#i?.state ?? Pn();
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
    J.batch(() => {
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
}, qr = class extends Xe {
  constructor(t = {}) {
    super(), this.config = t, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(t, e, i) {
    const n = e.queryKey, r = e.queryHash ?? di(n, e);
    let o = this.get(r);
    return o || (o = new Br({
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
    J.batch(() => {
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
      (i) => zi(e, i)
    );
  }
  findAll(t = {}) {
    const e = this.getAll();
    return Object.keys(t).length > 0 ? e.filter((i) => zi(t, i)) : e;
  }
  notify(t) {
    J.batch(() => {
      this.listeners.forEach((e) => {
        e(t);
      });
    });
  }
  onFocus() {
    J.batch(() => {
      this.getAll().forEach((t) => {
        t.onFocus();
      });
    });
  }
  onOnline() {
    J.batch(() => {
      this.getAll().forEach((t) => {
        t.onOnline();
      });
    });
  }
}, Qr = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  #s;
  constructor(t = {}) {
    this.#e = t.queryCache || new qr(), this.#t = t.mutationCache || new Vr(), this.#i = t.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = fi.subscribe(async (t) => {
      t && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = Rt.subscribe(async (t) => {
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
    return n === void 0 ? this.fetchQuery(t) : (t.revalidateIfStale && i.isStaleByTime(Fe(e.staleTime, i)) && this.prefetchQuery(e), Promise.resolve(n));
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
    )?.state.data, l = Tr(e, o);
    if (l !== void 0)
      return this.#e.build(this, n).setData(l, { ...i, manual: !0 });
  }
  setQueriesData(t, e, i) {
    return J.batch(
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
    J.batch(() => {
      e.findAll(t).forEach((i) => {
        e.remove(i);
      });
    });
  }
  resetQueries(t, e) {
    const i = this.#e;
    return J.batch(() => (i.findAll(t).forEach((n) => {
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
    const i = { revert: !0, ...e }, n = J.batch(
      () => this.#e.findAll(t).map((r) => r.cancel(i))
    );
    return Promise.all(n).then(se).catch(se);
  }
  invalidateQueries(t, e = {}) {
    return J.batch(() => (this.#e.findAll(t).forEach((i) => {
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
    }, n = J.batch(
      () => this.#e.findAll(t).filter((r) => !r.isDisabled() && !r.isStatic()).map((r) => {
        let o = r.fetch(void 0, i);
        return i.throwOnError || (o = o.catch(se)), r.state.fetchStatus === "paused" ? Promise.resolve() : o;
      })
    );
    return Promise.all(n).then(se);
  }
  fetchQuery(t) {
    const e = this.defaultQueryOptions(t);
    e.retry === void 0 && (e.retry = !1);
    const i = this.#e.build(this, e);
    return i.isStaleByTime(
      Fe(e.staleTime, i)
    ) ? i.fetch(e) : Promise.resolve(i.state.data);
  }
  prefetchQuery(t) {
    return this.fetchQuery(t).then(se).catch(se);
  }
  fetchInfiniteQuery(t) {
    return t.behavior = $i(t.pages), this.fetchQuery(t);
  }
  prefetchInfiniteQuery(t) {
    return this.fetchInfiniteQuery(t).then(se).catch(se);
  }
  ensureInfiniteQueryData(t) {
    return t.behavior = $i(t.pages), this.ensureQueryData(t);
  }
  resumePausedMutations() {
    return Rt.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
    this.#r.set(Ve(t), {
      queryKey: t,
      defaultOptions: e
    });
  }
  getQueryDefaults(t) {
    const e = [...this.#r.values()], i = {};
    return e.forEach((n) => {
      lt(t, n.queryKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  setMutationDefaults(t, e) {
    this.#n.set(Ve(t), {
      mutationKey: t,
      defaultOptions: e
    });
  }
  getMutationDefaults(t) {
    const e = [...this.#n.values()], i = {};
    return e.forEach((n) => {
      lt(t, n.mutationKey) && Object.assign(i, n.defaultOptions);
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
    return e.queryHash || (e.queryHash = di(
      e.queryKey,
      e
    )), e.refetchOnReconnect === void 0 && (e.refetchOnReconnect = e.networkMode !== "always"), e.throwOnError === void 0 && (e.throwOnError = !!e.suspense), !e.networkMode && e.persister && (e.networkMode = "offlineFirst"), e.queryFn === ui && (e.enabled = !1), e;
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
function jr(t, e) {
  for (var i in e) t[i] = e[i];
  return t;
}
function Ki(t, e) {
  for (var i in t) if (i !== "__source" && !(i in e)) return !0;
  for (var n in e) if (n !== "__source" && t[n] !== e[n]) return !0;
  return !1;
}
function An(t, e) {
  var i = e(), n = E({ t: { __: i, u: e } }), r = n[0].t, o = n[1];
  return cr(function() {
    r.__ = i, r.u = e, Dt(r) && o({ t: r });
  }, [t, i, e]), te(function() {
    return Dt(r) && o({ t: r }), t(function() {
      Dt(r) && o({ t: r });
    });
  }, [t]), i;
}
function Dt(t) {
  var e, i, n = t.u, r = t.__;
  try {
    var o = n();
    return !((e = r) === (i = o) && (e !== 0 || 1 / e == 1 / i) || e != e && i != i);
  } catch {
    return !0;
  }
}
function qi(t, e) {
  this.props = t, this.context = e;
}
(qi.prototype = new ke()).isPureReactComponent = !0, qi.prototype.shouldComponentUpdate = function(t, e) {
  return Ki(this.props, t) || Ki(this.state, e);
};
var Qi = F.__b;
F.__b = function(t) {
  t.type && t.type.__f && t.ref && (t.props.ref = t.ref, t.ref = null), Qi && Qi(t);
};
var Yr = F.__e;
F.__e = function(t, e, i, n) {
  if (t.then) {
    for (var r, o = e; o = o.__; ) if ((r = o.__c) && r.__c) return e.__e == null && (e.__e = i.__e, e.__k = i.__k), r.__c(t, e);
  }
  Yr(t, e, i, n);
};
var ji = F.unmount;
function Ln(t, e, i) {
  return t && (t.__c && t.__c.__H && (t.__c.__H.__.forEach(function(n) {
    typeof n.__c == "function" && n.__c();
  }), t.__c.__H = null), (t = jr({}, t)).__c != null && (t.__c.__P === i && (t.__c.__P = e), t.__c.__e = !0, t.__c = null), t.__k = t.__k && t.__k.map(function(n) {
    return Ln(n, e, i);
  })), t;
}
function Fn(t, e, i) {
  return t && i && (t.__v = null, t.__k = t.__k && t.__k.map(function(n) {
    return Fn(n, e, i);
  }), t.__c && t.__c.__P === e && (t.__e && i.appendChild(t.__e), t.__c.__e = !0, t.__c.__P = i)), t;
}
function zt() {
  this.__u = 0, this.o = null, this.__b = null;
}
function Dn(t) {
  if (!t.__) return null;
  var e = t.__.__c;
  return e && e.__a && e.__a(t);
}
function gt() {
  this.i = null, this.l = null;
}
F.unmount = function(t) {
  var e = t.__c;
  e && (e.__z = !0), e && e.__R && e.__R(), e && 32 & t.__u && (t.type = null), ji && ji(t);
}, (zt.prototype = new ke()).__c = function(t, e) {
  var i = e.__c, n = this;
  n.o == null && (n.o = []), n.o.push(i);
  var r = Dn(n.__v), o = !1, l = function() {
    o || n.__z || (o = !0, i.__R = null, r ? r(d) : d());
  };
  i.__R = l;
  var a = i.__P;
  i.__P = null;
  var d = function() {
    if (!--n.__u) {
      if (n.state.__a) {
        var u = n.state.__a;
        n.__v.__k[0] = Fn(u, u.__c.__P, u.__c.__O);
      }
      var h;
      for (n.setState({ __a: n.__b = null }); h = n.o.pop(); ) h.__P = a, h.forceUpdate();
    }
  };
  n.__u++ || 32 & e.__u || n.setState({ __a: n.__b = n.__v.__k[0] }), t.then(l, l);
}, zt.prototype.componentWillUnmount = function() {
  this.o = [];
}, zt.prototype.render = function(t, e) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), n = this.__v.__k[0].__c;
      this.__v.__k[0] = Ln(this.__b, i, n.__O = n.__P);
    }
    this.__b = null;
  }
  var r = e.__a && Vt(X, null, t.fallback);
  return r && (r.__u &= -33), [Vt(X, null, e.__a ? null : t.children), r];
};
var Yi = function(t, e, i) {
  if (++i[1] === i[0] && t.l.delete(e), t.props.revealOrder && (t.props.revealOrder[0] !== "t" || !t.l.size)) for (i = t.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    t.i = i = i[2];
  }
};
(gt.prototype = new ke()).__a = function(t) {
  var e = this, i = Dn(e.__v), n = e.l.get(t);
  return n[0]++, function(r) {
    var o = function() {
      e.props.revealOrder ? (n.push(r), Yi(e, t, n)) : r();
    };
    i ? i(o) : o();
  };
}, gt.prototype.render = function(t) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var e = kt(t.children);
  t.revealOrder && t.revealOrder[0] === "b" && e.reverse();
  for (var i = e.length; i--; ) this.l.set(e[i], this.i = [1, 0, this.i]);
  return t.children;
}, gt.prototype.componentDidUpdate = gt.prototype.componentDidMount = function() {
  var t = this;
  this.l.forEach(function(e, i) {
    Yi(t, i, e);
  });
};
var Xr = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, Jr = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, Zr = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, es = /[A-Z0-9]/g, ts = typeof document < "u", is = function(t) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(t);
};
ke.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(t) {
  Object.defineProperty(ke.prototype, t, { configurable: !0, get: function() {
    return this["UNSAFE_" + t];
  }, set: function(e) {
    Object.defineProperty(this, t, { configurable: !0, writable: !0, value: e });
  } });
});
var Xi = F.event;
function ns() {
}
function rs() {
  return this.cancelBubble;
}
function ss() {
  return this.defaultPrevented;
}
F.event = function(t) {
  return Xi && (t = Xi(t)), t.persist = ns, t.isPropagationStopped = rs, t.isDefaultPrevented = ss, t.nativeEvent = t;
};
var os = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, Ji = F.vnode;
F.vnode = function(t) {
  typeof t.type == "string" && (function(e) {
    var i = e.props, n = e.type, r = {}, o = n.indexOf("-") === -1;
    for (var l in i) {
      var a = i[l];
      if (!(l === "value" && "defaultValue" in i && a == null || ts && l === "children" && n === "noscript" || l === "class" || l === "className")) {
        var d = l.toLowerCase();
        l === "defaultValue" && "value" in i && i.value == null ? l = "value" : l === "download" && a === !0 ? a = "" : d === "translate" && a === "no" ? a = !1 : d[0] === "o" && d[1] === "n" ? d === "ondoubleclick" ? l = "ondblclick" : d !== "onchange" || n !== "input" && n !== "textarea" || is(i.type) ? d === "onfocus" ? l = "onfocusin" : d === "onblur" ? l = "onfocusout" : Zr.test(l) && (l = d) : d = l = "oninput" : o && Jr.test(l) ? l = l.replace(es, "-$&").toLowerCase() : a === null && (a = void 0), d === "oninput" && r[l = d] && (l = "oninputCapture"), r[l] = a;
      }
    }
    n == "select" && r.multiple && Array.isArray(r.value) && (r.value = kt(i.children).forEach(function(u) {
      u.props.selected = r.value.indexOf(u.props.value) != -1;
    })), n == "select" && r.defaultValue != null && (r.value = kt(i.children).forEach(function(u) {
      u.props.selected = r.multiple ? r.defaultValue.indexOf(u.props.value) != -1 : r.defaultValue == u.props.value;
    })), i.class && !i.className ? (r.class = i.class, Object.defineProperty(r, "className", os)) : (i.className && !i.class || i.class && i.className) && (r.class = r.className = i.className), e.props = r;
  })(t), t.$$typeof = Xr, Ji && Ji(t);
};
var Zi = F.__r;
F.__r = function(t) {
  Zi && Zi(t), t.__c;
};
var en = F.diffed;
F.diffed = function(t) {
  en && en(t);
  var e = t.props, i = t.__e;
  i != null && t.type === "textarea" && "value" in e && e.value !== i.value && (i.value = e.value == null ? "" : e.value);
};
var zn = ai(
  void 0
), ut = (t) => {
  const e = li(zn);
  if (!e)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return e;
}, as = ({
  client: t,
  children: e
}) => (te(() => (t.mount(), () => {
  t.unmount();
}), [t]), /* @__PURE__ */ s(zn.Provider, { value: t, children: e })), Mn = ai(!1), ls = () => li(Mn);
Mn.Provider;
function cs() {
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
var ds = ai(cs()), us = () => li(ds), hs = (t, e, i) => {
  const n = i?.state.error && typeof t.throwOnError == "function" ? hi(t.throwOnError, [i.state.error, i]) : t.throwOnError;
  (t.suspense || t.experimental_prefetchInRender || n) && (e.isReset() || (t.retryOnMount = !1));
}, fs = (t) => {
  te(() => {
    t.clearReset();
  }, [t]);
}, ps = ({
  result: t,
  errorResetBoundary: e,
  throwOnError: i,
  query: n,
  suspense: r
}) => t.isError && !e.isReset() && !t.isFetching && n && (r && t.data === void 0 || hi(i, [t.error, n])), ms = (t) => {
  if (t.suspense) {
    const i = (r) => r === "static" ? r : Math.max(r ?? 1e3, 1e3), n = t.staleTime;
    t.staleTime = typeof n == "function" ? (...r) => i(n(...r)) : i(n), typeof t.gcTime == "number" && (t.gcTime = Math.max(
      t.gcTime,
      1e3
    ));
  }
}, gs = (t, e) => t.isLoading && t.isFetching && !e, ys = (t, e) => t?.suspense && e.isPending, tn = (t, e, i) => e.fetchOptimistic(t).catch(() => {
  i.clearReset();
});
function _s(t, e, i) {
  const n = ls(), r = us(), o = ut(), l = o.defaultQueryOptions(t);
  o.getDefaultOptions().queries?._experimental_beforeQuery?.(
    l
  );
  const a = o.getQueryCache().get(l.queryHash);
  l._optimisticResults = n ? "isRestoring" : "optimistic", ms(l), hs(l, r, a), fs(r);
  const d = !o.getQueryCache().get(l.queryHash), [u] = E(
    () => new e(
      o,
      l
    )
  ), h = u.getOptimisticResult(l), c = !n && t.subscribed !== !1;
  if (An(
    be(
      (f) => {
        const m = c ? u.subscribe(J.batchCalls(f)) : se;
        return u.updateResult(), m;
      },
      [u, c]
    ),
    () => u.getCurrentResult()
  ), te(() => {
    u.setOptions(l);
  }, [l, u]), ys(l, h))
    throw tn(l, u, r);
  if (ps({
    result: h,
    errorResetBoundary: r,
    throwOnError: l.throwOnError,
    query: a,
    suspense: l.suspense
  }))
    throw h.error;
  return o.getDefaultOptions().queries?._experimental_afterQuery?.(
    l,
    h
  ), l.experimental_prefetchInRender && !$e && gs(h, n) && (d ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    tn(l, u, r)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    a?.promise
  ))?.catch(se).finally(() => {
    u.updateResult();
  }), l.notifyOnChangeProps ? h : u.trackResult(h);
}
function At(t, e) {
  return _s(t, Ur);
}
function Ke(t, e) {
  const i = ut(), [n] = E(
    () => new Kr(
      i,
      t
    )
  );
  te(() => {
    n.setOptions(t);
  }, [n, t]);
  const r = An(
    be(
      (l) => n.subscribe(J.batchCalls(l)),
      [n]
    ),
    () => n.getCurrentResult()
  ), o = be(
    (l, a) => {
      n.mutate(l, a).catch(se);
    },
    [n]
  );
  if (r.error && hi(n.options.throwOnError, [r.error]))
    throw r.error;
  return { ...r, mutate: o, mutateAsync: r.mutate };
}
const K = "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif", p = {
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
    fontFamily: K,
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
}, vs = `
* { font-family: ${K}; }
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
@keyframes editor-spin { to { transform: rotate(360deg); } }
.editor-spinner { display: inline-block; animation: editor-spin 0.8s linear infinite; }
`;
function z({
  variant: t,
  children: e,
  onClick: i,
  type: n = "button",
  title: r,
  active: o = !1,
  style: l,
  class: a,
  disabled: d,
  "aria-label": u
}) {
  const h = t === "primary" ? p.primaryBtn : t === "secondary" ? p.secondaryBtn : t === "icon" ? p.iconBtn : t === "iconSm" ? p.iconBtnSm : t === "placement" ? p.placementBtn(o) : {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.25rem",
    fontFamily: K
  }, c = l ? { ...h, ...l } : h;
  return /* @__PURE__ */ s(
    "button",
    {
      type: n,
      style: c,
      class: a,
      onClick: i,
      title: r,
      disabled: d,
      "aria-label": u,
      children: e
    }
  );
}
const bs = [
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
      { type: "poll-text", icon: "mdi:comment-text-outline", label: "Open Text Poll" },
      { type: "poll-yes-no", icon: "mdi:check-circle-outline", label: "Yes/No Poll" },
      { type: "poll-scale", icon: "mdi:pound", label: "Number Scale Poll" }
    ]
  }
];
function xs({ onAddBlock: t, onClose: e }) {
  return /* @__PURE__ */ s("div", { style: {
    width: "210px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #e2e8f0",
    background: "#fff",
    fontFamily: K
  }, children: [
    /* @__PURE__ */ s("div", { style: { padding: "1.25rem 1rem", borderBottom: "1px solid #e2e8f0" }, children: [
      /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }, children: "Building Blocks" }),
      /* @__PURE__ */ s("div", { style: { fontSize: "0.65rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.2rem" }, children: "Click to add component" })
    ] }),
    /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "0.75rem" }, children: bs.map((i) => /* @__PURE__ */ s("div", { style: { marginBottom: "1.25rem" }, children: [
      /* @__PURE__ */ s("div", { style: p.sectionLabel, children: i.label }),
      /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.3rem" }, children: i.blocks.map(({ type: n, icon: r, label: o }) => /* @__PURE__ */ s(
        "button",
        {
          onClick: () => t(n),
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
            fontFamily: K,
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
            /* @__PURE__ */ s("iconify-icon", { icon: r, style: { fontSize: "1rem", color: "#64748b", flexShrink: 0 } }),
            o
          ]
        },
        n
      )) })
    ] }, i.label)) }),
    /* @__PURE__ */ s("div", { style: { padding: "0.75rem", borderTop: "1px solid #e2e8f0" }, children: /* @__PURE__ */ s(
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
          fontFamily: K
        },
        children: "Close Editor"
      }
    ) })
  ] });
}
const Ss = {
  text: "Text",
  image: "Image",
  button: "Button",
  "horizontal-line": "Horizontal Line",
  video: "Video",
  "poll-text": "Open Text Poll",
  "poll-yes-no": "Yes/No Poll",
  "poll-scale": "Number Scale Poll"
};
function Q({ label: t, children: e }) {
  return /* @__PURE__ */ s("div", { style: { marginBottom: "1rem" }, children: [
    /* @__PURE__ */ s("label", { style: {
      display: "block",
      fontSize: "0.7rem",
      fontWeight: 600,
      color: "#64748b",
      marginBottom: "0.35rem",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      fontFamily: K
    }, children: t }),
    e
  ] });
}
const ce = {
  ...p.input,
  boxSizing: "border-box",
  fontSize: "0.85rem",
  padding: "0.55rem 0.75rem"
}, yt = {
  ...p.textarea,
  boxSizing: "border-box",
  fontSize: "0.85rem",
  padding: "0.55rem 0.75rem",
  minHeight: "unset"
}, Mt = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  border: "1px solid #e2e8f0",
  borderRadius: "0.625rem",
  fontSize: "0.85rem",
  color: "#334155",
  background: "#fff",
  fontFamily: K,
  boxSizing: "border-box"
};
function ws({ block: t, onUpdate: e, onCancel: i, onDone: n }) {
  const r = t.settings, o = (a, d) => e(t.id, { ...r, [a]: d }), l = () => {
    switch (t.type) {
      case "text":
        return /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s(Q, { label: "Theme Style", children: /* @__PURE__ */ s("select", { value: r.themeStyle || "body", onChange: (a) => o("themeStyle", a.target.value), style: Mt, children: [
            /* @__PURE__ */ s("option", { value: "title", children: "Title" }),
            /* @__PURE__ */ s("option", { value: "sub-title", children: "Sub Title" }),
            /* @__PURE__ */ s("option", { value: "body", children: "Body" })
          ] }) }),
          /* @__PURE__ */ s(Q, { label: "Content", children: /* @__PURE__ */ s(
            "textarea",
            {
              value: r.content || "",
              onInput: (a) => o("content", a.target.value),
              placeholder: "Enter your text here",
              rows: 4,
              style: yt
            }
          ) })
        ] });
      case "button":
        return /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s(Q, { label: "Label", children: /* @__PURE__ */ s("input", { type: "text", value: r.label || "", onInput: (a) => o("label", a.target.value), placeholder: "Continue", style: ce }) }),
          /* @__PURE__ */ s(Q, { label: "Action", children: /* @__PURE__ */ s("select", { value: r.action || "next", onChange: (a) => o("action", a.target.value), style: Mt, children: [
            /* @__PURE__ */ s("option", { value: "next", children: "Next / Finish" }),
            /* @__PURE__ */ s("option", { value: "dismiss", children: "Dismiss" }),
            /* @__PURE__ */ s("option", { value: "url", children: "Open URL" })
          ] }) }),
          r.action === "url" && /* @__PURE__ */ s(Q, { label: "URL", children: /* @__PURE__ */ s("input", { type: "text", value: r.url || "", onInput: (a) => o("url", a.target.value), placeholder: "https://...", style: ce }) })
        ] });
      case "image":
        return /* @__PURE__ */ s(Q, { label: "Image URL", children: /* @__PURE__ */ s("input", { type: "text", value: r.url || "", onInput: (a) => o("url", a.target.value), placeholder: "https://...", style: ce }) });
      case "video":
        return /* @__PURE__ */ s(Q, { label: "Video Embed URL", children: /* @__PURE__ */ s("input", { type: "text", value: r.url || "", onInput: (a) => o("url", a.target.value), placeholder: "https://youtube.com/embed/...", style: ce }) });
      case "poll-text":
        return /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s(Q, { label: "Question", children: /* @__PURE__ */ s("textarea", { value: r.question || "", onInput: (a) => o("question", a.target.value), placeholder: "How can we improve?", rows: 3, style: yt }) }),
          /* @__PURE__ */ s(Q, { label: "Question Style", children: /* @__PURE__ */ s("select", { value: r.themeStyle || "body", onChange: (a) => o("themeStyle", a.target.value), style: Mt, children: [
            /* @__PURE__ */ s("option", { value: "title", children: "Title" }),
            /* @__PURE__ */ s("option", { value: "sub-title", children: "Sub Title" }),
            /* @__PURE__ */ s("option", { value: "body", children: "Body" })
          ] }) }),
          /* @__PURE__ */ s(Q, { label: "Answer Placeholder", children: /* @__PURE__ */ s("input", { type: "text", value: r.placeholder || "", onInput: (a) => o("placeholder", a.target.value), placeholder: "Enter text here...", style: ce }) }),
          /* @__PURE__ */ s(Q, { label: "Submit Button Label", children: /* @__PURE__ */ s("input", { type: "text", value: r.submitLabel || "", onInput: (a) => o("submitLabel", a.target.value), placeholder: "Submit", style: ce }) })
        ] });
      case "poll-yes-no":
        return /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s(Q, { label: "Question", children: /* @__PURE__ */ s("textarea", { value: r.question || "", onInput: (a) => o("question", a.target.value), placeholder: "Was this guide helpful?", rows: 3, style: yt }) }),
          /* @__PURE__ */ s(Q, { label: "Yes Label", children: /* @__PURE__ */ s("input", { type: "text", value: r.yesLabel || "", onInput: (a) => o("yesLabel", a.target.value), placeholder: "Yes", style: ce }) }),
          /* @__PURE__ */ s(Q, { label: "No Label", children: /* @__PURE__ */ s("input", { type: "text", value: r.noLabel || "", onInput: (a) => o("noLabel", a.target.value), placeholder: "No", style: ce }) })
        ] });
      case "poll-scale":
        return /* @__PURE__ */ s(X, { children: [
          /* @__PURE__ */ s(Q, { label: "Question", children: /* @__PURE__ */ s("textarea", { value: r.question || "", onInput: (a) => o("question", a.target.value), placeholder: "How would you rate this?", rows: 3, style: yt }) }),
          /* @__PURE__ */ s(Q, { label: "Min Value", children: /* @__PURE__ */ s("input", { type: "number", value: r.minValue ?? 1, onInput: (a) => o("minValue", Number(a.target.value)), style: ce }) }),
          /* @__PURE__ */ s(Q, { label: "Max Value", children: /* @__PURE__ */ s("input", { type: "number", value: r.maxValue ?? 5, onInput: (a) => o("maxValue", Number(a.target.value)), style: ce }) }),
          /* @__PURE__ */ s(Q, { label: "Show Min / Max Labels", children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" }, children: [
            /* @__PURE__ */ s(
              "input",
              {
                type: "checkbox",
                checked: r.showLabels ?? !0,
                onChange: (a) => o("showLabels", a.target.checked),
                style: { accentColor: "#1d4ed8", width: "16px", height: "16px", cursor: "pointer" }
              }
            ),
            /* @__PURE__ */ s("span", { style: { fontSize: "0.8rem", color: "#475569", fontFamily: K }, children: "Show labels below scale" })
          ] }) }),
          r.showLabels && /* @__PURE__ */ s(X, { children: [
            /* @__PURE__ */ s(Q, { label: `Min Label (at ${r.minValue ?? 1})`, children: /* @__PURE__ */ s(
              "input",
              {
                type: "text",
                value: r.labels?.[r.minValue ?? 1] || "",
                onInput: (a) => o("labels", { ...r.labels, [r.minValue ?? 1]: a.target.value }),
                placeholder: "e.g. Not likely",
                style: ce
              }
            ) }),
            /* @__PURE__ */ s(Q, { label: `Max Label (at ${r.maxValue ?? 5})`, children: /* @__PURE__ */ s(
              "input",
              {
                type: "text",
                value: r.labels?.[r.maxValue ?? 5] || "",
                onInput: (a) => o("labels", { ...r.labels, [r.maxValue ?? 5]: a.target.value }),
                placeholder: "e.g. Very likely",
                style: ce
              }
            ) })
          ] }),
          /* @__PURE__ */ s(Q, { label: "Submit Button Label", children: /* @__PURE__ */ s("input", { type: "text", value: r.submitLabel || "", onInput: (a) => o("submitLabel", a.target.value), placeholder: "Submit", style: ce }) })
        ] });
      case "horizontal-line":
        return /* @__PURE__ */ s("p", { style: { fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic", margin: 0 }, children: "No settings for this block." });
      default:
        return null;
    }
  };
  return /* @__PURE__ */ s("div", { style: {
    width: "260px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderLeft: "1px solid #e2e8f0",
    background: "#fff",
    fontFamily: K
  }, children: [
    /* @__PURE__ */ s("div", { style: { padding: "1.25rem 1rem", borderBottom: "1px solid #e2e8f0" }, children: [
      /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }, children: [
        "Edit ",
        Ss[t.type] || t.type
      ] }),
      /* @__PURE__ */ s("div", { style: { fontSize: "0.65rem", fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.2rem" }, children: "Configure Component" })
    ] }),
    /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1rem" }, children: l() }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.5rem", padding: "0.75rem 1rem", borderTop: "1px solid #e2e8f0" }, children: [
      /* @__PURE__ */ s(
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
            fontFamily: K
          },
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ s(
        "button",
        {
          onClick: n,
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
            fontFamily: K
          },
          children: "Done"
        }
      )
    ] })
  ] });
}
const Es = {
  text: { content: "Enter your text here", themeStyle: "body" },
  image: { url: "" },
  button: { label: "Next", action: "next" },
  "horizontal-line": {},
  video: { url: "" },
  "poll-text": { question: "How can we improve?", placeholder: "Enter text here...", submitLabel: "Submit", themeStyle: "body" },
  "poll-yes-no": { question: "Was this helpful?", yesLabel: "Yes", noLabel: "No" },
  "poll-scale": { question: "How would you rate this?", minValue: 1, maxValue: 5, showLabels: !0, labels: { 1: "Low", 5: "High" }, submitLabel: "Submit" }
};
function Nt(t, e = !1) {
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
    fontFamily: K
  };
}
const _t = () => {
};
function Cs(t) {
  if (t.blocks && t.blocks.length > 0) return t.blocks;
  const e = [], i = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return t.title && e.push({ id: i(), type: "text", settings: { content: t.title, themeStyle: "title" } }), t.description && e.push({ id: i(), type: "text", settings: { content: t.description, themeStyle: "body" } }), t.body && e.push({ id: i(), type: "text", settings: { content: t.body, themeStyle: "body" } }), t.buttonContent && e.push({ id: i(), type: "button", settings: { label: t.buttonContent, action: "next" } }), e;
}
function Is({ initialContent: t, onSave: e, onClose: i, onPreview: n, stepLabel: r }) {
  const o = (() => {
    try {
      return JSON.parse(t || "{}");
    } catch {
      return {};
    }
  })(), [l, a] = E(Cs(o)), [d, u] = E(null), h = l.find((g) => g.id === d) ?? null, c = (g) => {
    const A = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: g,
      settings: { ...Es[g] }
    };
    a((O) => [...O, A]), u(A.id);
  }, f = (g, A) => {
    a((O) => O.map((P) => P.id === g ? { ...P, settings: A } : P));
  }, m = (g) => {
    a((A) => A.filter((O) => O.id !== g)), d === g && u(null);
  }, y = (g, A) => {
    const O = g + A;
    a((P) => {
      if (O < 0 || O >= P.length) return P;
      const M = [...P];
      return [M[g], M[O]] = [M[O], M[g]], M;
    });
  }, b = () => {
    const g = { blocks: l };
    return o.layout && (g.layout = o.layout), JSON.stringify(g);
  }, x = () => {
    e(b());
  }, C = () => {
    n && n(b());
  };
  return /* @__PURE__ */ s("div", { style: {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    display: "flex",
    background: "#F8FAFC",
    fontFamily: K
  }, children: [
    /* @__PURE__ */ s(xs, { onAddBlock: c, onClose: i }),
    /* @__PURE__ */ s("div", { style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      overflowY: "auto",
      position: "relative"
    }, children: [
      /* @__PURE__ */ s("div", { style: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.04,
        backgroundImage: "radial-gradient(#1855BC 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      } }),
      /* @__PURE__ */ s("div", { style: { position: "absolute", top: "1.75rem", left: "2rem", zIndex: 10 }, children: [
        /* @__PURE__ */ s("h1", { style: { fontSize: "1.4rem", fontWeight: 700, color: "#222", margin: 0, letterSpacing: "-0.03em" }, children: r ? `Editing: ${r}` : "Design your guide step" }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem", fontWeight: 500 }, children: "Drag and drop building blocks to craft your experience" })
      ] }),
      /* @__PURE__ */ s("div", { style: {
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
        /* @__PURE__ */ s("div", { style: {
          position: "absolute",
          top: "12px",
          right: "12px",
          color: "#cbd5e1",
          cursor: "not-allowed",
          zIndex: 20
        }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "16px" } }) }),
        /* @__PURE__ */ s("div", { style: { padding: "1.5rem", display: "flex", flexDirection: "column", gap: 0 }, children: l.length === 0 ? /* @__PURE__ */ s("div", { style: {
          padding: "3rem 1rem",
          border: "2px dashed #e2e8f0",
          borderRadius: "0.75rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          color: "#94a3b8"
        }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus-circle-outline", style: { fontSize: "2rem" } }),
          /* @__PURE__ */ s("span", { style: { fontSize: "0.8rem", fontWeight: 600, textAlign: "center" }, children: "Click a block type on the left to start" })
        ] }) : l.map((g, A) => {
          const O = d === g.id;
          return /* @__PURE__ */ s(
            "div",
            {
              onClick: () => u(g.id),
              style: {
                position: "relative",
                borderRadius: "0.5rem",
                border: O ? "2px solid #3b82f6" : "2px solid transparent",
                background: O ? "rgba(59,130,246,0.03)" : "transparent",
                cursor: "pointer",
                transition: "border-color 0.15s",
                padding: "4px",
                marginBottom: "4px"
              },
              children: [
                O && /* @__PURE__ */ s("div", { style: {
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  display: "flex",
                  gap: "4px",
                  zIndex: 10
                }, children: [
                  /* @__PURE__ */ s("button", { onClick: (P) => {
                    P.stopPropagation(), y(A, -1);
                  }, style: Nt(A === 0), title: "Move up", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-up", style: { fontSize: "14px" } }) }),
                  /* @__PURE__ */ s("button", { onClick: (P) => {
                    P.stopPropagation(), y(A, 1);
                  }, style: Nt(A === l.length - 1), title: "Move down", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-down", style: { fontSize: "14px" } }) }),
                  /* @__PURE__ */ s("button", { onClick: (P) => {
                    P.stopPropagation(), m(g.id);
                  }, style: Nt(!1, !0), title: "Delete", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:trash-can-outline", style: { fontSize: "14px" } }) })
                ] }),
                /* @__PURE__ */ s("div", { style: { pointerEvents: "none" }, children: /* @__PURE__ */ s(
                  Pt,
                  {
                    block: g,
                    onNext: _t,
                    onBack: _t,
                    onDismiss: _t,
                    onAction: _t,
                    isFirstStep: !0,
                    isLastStep: !0
                  }
                ) })
              ]
            },
            g.id
          );
        }) })
      ] }),
      /* @__PURE__ */ s("div", { style: { marginTop: "2rem", display: "flex", gap: "0.75rem", zIndex: 10, position: "relative" }, children: [
        n && /* @__PURE__ */ s(
          "button",
          {
            onClick: C,
            style: {
              padding: "0.75rem 2rem",
              background: "#fff",
              color: "#1855BC",
              border: "2px solid #1855BC",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              fontFamily: K,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:eye-outline", style: { fontSize: "16px" } }),
              "Preview on Page"
            ]
          }
        ),
        /* @__PURE__ */ s(
          "button",
          {
            onClick: x,
            style: {
              padding: "0.75rem 3rem",
              background: "#1855BC",
              color: "#fff",
              border: "none",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              fontFamily: K,
              boxShadow: "0 10px 20px rgba(24,85,188,0.2)"
            },
            children: "Save Template"
          }
        )
      ] })
    ] }),
    h && /* @__PURE__ */ s(
      ws,
      {
        block: h,
        onUpdate: f,
        onCancel: () => u(null),
        onDone: () => u(null)
      }
    )
  ] });
}
const ks = "https://devgw.revgain.ai/rg-pex", Nn = "designerIud";
function Ts() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(Nn);
  } catch {
    return null;
  }
}
function vt(t) {
  const e = {
    "Content-Type": "application/json",
    schema: "customer_1001",
    ...t
  }, i = Ts();
  return i && (e.iud = i), e;
}
const ae = {
  baseUrl: ks,
  async get(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, n = await fetch(i, {
      ...e,
      headers: { ...vt(), ...e?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  },
  async post(t, e, i) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "POST",
      ...i,
      headers: { ...vt(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async put(t, e, i) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "PUT",
      ...i,
      headers: { ...vt(), ...i?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async delete(t, e) {
    const i = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, n = await fetch(i, {
      method: "DELETE",
      ...e,
      headers: { ...vt(), ...e?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  }
}, Bn = (t) => ["guides", "byId", t];
async function Rs(t) {
  const e = new URLSearchParams({ guide_id: t });
  return ae.get(`/guides?${e.toString()}`);
}
function Os(t) {
  return At({
    queryKey: Bn(t),
    queryFn: () => Rs(t),
    enabled: !!t,
    retry: 0
  });
}
const Ps = ["guides", "update"];
async function As({
  guideId: t,
  payload: e
}) {
  return ae.put(`/guides/${t}`, e);
}
function Ls() {
  const t = ut();
  return Ke({
    mutationKey: Ps,
    mutationFn: As,
    onSuccess: (e, i) => {
      t.invalidateQueries({ queryKey: Bn(i.guideId) });
    }
  });
}
const Fs = [
  "top-left",
  "top",
  "top-right",
  null,
  "center",
  null,
  "bottom-left",
  "bottom",
  "bottom-right"
], Ds = {
  "top-left": "↖",
  top: "↑",
  "top-right": "↗",
  center: "●",
  "bottom-left": "↙",
  bottom: "↓",
  "bottom-right": "↘"
}, nn = {
  "top-left": "Top Left",
  top: "Top",
  "top-right": "Top Right",
  center: "Center",
  "bottom-left": "Bottom Left",
  bottom: "Bottom",
  "bottom-right": "Bottom Right"
}, zs = [
  { value: "draft", label: "Draft", bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1", icon: "mdi:pencil-outline" },
  { value: "active", label: "Active", bg: "#dcfce7", color: "#16a34a", border: "#86efac", icon: "mdi:check-circle-outline" },
  { value: "inactive", label: "Inactive", bg: "#fef9c3", color: "#ca8a04", border: "#fde047", icon: "mdi:pause-circle-outline" },
  { value: "archived", label: "Archived", bg: "#fee2e2", color: "#dc2626", border: "#fca5a5", icon: "mdi:archive-outline" }
];
function Ms({
  onMessage: t,
  elementSelected: e,
  guideId: i = null,
  templateId: n = null
}) {
  const [r, o] = E(""), [l, a] = E(void 0), [d, u] = E(null), [h, c] = E(""), [f, m] = E(null), [y, b] = E(!1), [x, C] = E("on_click"), [g, A] = E(null), [O, P] = E(!1), [M, G] = E(!1), [L, U] = E("anchored"), [B, k] = E("modal"), [H, Z] = E("center"), [pe, me] = E("top"), [Re, Oe] = E(null), [De, ge] = E(!1), [he, Ee] = E(!1), [ze, qe] = E(!1), [Pe, ye] = E(!1), [Qe, xe] = E("draft"), Ce = dr(null), { data: je, isLoading: _e } = Os(i), I = je?.data, T = we(() => I ? I.templates && I.templates.length > 0 ? I.templates : I.steps || [] : [], [I]), Y = Ls(), oe = we(
    () => [...T].sort((_, R) => _.step_order - R.step_order),
    [T]
  ), $ = we(() => f ? T.find((_) => _.map_id === f) : null, [f, T]), Ae = we(
    () => oe.findIndex((_) => _.map_id === f),
    [oe, f]
  ), ve = (_) => {
    try {
      const R = JSON.parse(de(_) || "{}");
      return R.title || R.blocks?.[0]?.settings?.content?.slice(0, 24) || _.template.title || "";
    } catch {
      return _.template.title || "";
    }
  };
  te(() => {
    if (T.length === 0) return;
    if (n) {
      const R = T.find((N) => N.template_id === n);
      R && m(R.map_id);
      return;
    }
    if (Ce.current) {
      const R = T.find((N) => N.template_id === Ce.current);
      if (Ce.current = null, R) {
        m(R.map_id);
        return;
      }
    }
    const _ = T.some((R) => R.map_id === f);
    (!f || !_) && m(T[0].map_id);
  }, [T, n]), te(() => {
    if (I) {
      C(I.target_segment ? "on_click" : "automatic");
      const _ = I.status;
      (_ === "draft" || _ === "active" || _ === "inactive" || _ === "archived") && xe(_);
    }
  }, [I]), te(() => {
    if (Oe(null), $) {
      G($.auto_click_target ?? !1), U($.x_path ? "anchored" : "floating");
      try {
        const _ = JSON.parse(de($) || "{}"), R = _.layout?.renderAs, N = _.layout?.position;
        R === "banner" ? (k("banner"), me(N === "bottom" ? "bottom" : "top")) : (k("modal"), Z(N ?? "center"));
      } catch {
        k("modal"), Z("center");
      }
    } else
      G(!1), Z("center"), U("floating");
  }, [$, i]), te(() => {
    t({ type: "EDITOR_READY" });
  }, []), te(() => {
    e ? y ? A({
      selector: e.selector,
      xpath: e.xpath,
      elementInfo: e.elementInfo
    }) : (o(e.selector), a(e.xpath), u(e.elementInfo), c("")) : y && A(null);
  }, [e, y]);
  const Je = () => {
    P(!1), o(""), a(void 0), u(null), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, S = () => {
    P(!1), o(""), a(void 0), u(null), U("floating"), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, ee = () => {
    P(!1), o(""), a(void 0), u(null), c(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, le = (_, R) => {
    try {
      const N = JSON.parse(_ || "{}");
      return R && (N.layout || (N.layout = {}), B === "banner" ? (N.layout.renderAs = "banner", N.layout.position = pe) : (N.layout.renderAs = "modal", N.layout.position = H)), JSON.stringify(N);
    } catch {
      return R ? JSON.stringify({ layout: B === "banner" ? { renderAs: "banner", position: pe } : { renderAs: "modal", position: H } }) : _;
    }
  }, jn = async () => {
    if (!I || !i) return;
    const _ = Ge();
    l ?? (r && (r.startsWith("/") || r.startsWith("//")));
    const R = T.slice().sort((q, D) => q.step_order - D.step_order).map((q) => {
      const D = q.map_id === f;
      let ne = q.x_path;
      D && (ne = L === "floating" ? null : l || r || q.x_path);
      const Me = !ne, ft = D ? Re ?? de(q) : de(q);
      return {
        template_id: q.template_id,
        step_order: q.step_order,
        url: D ? _ : q.url ?? _,
        x_path: ne,
        auto_click_target: D ? M : q.auto_click_target ?? !1,
        content: D ? le(ft, Me) : ft
      };
    }), N = {
      guide_name: I.guide_name ?? "",
      description: I.description ?? "",
      target_segment: I.target_segment ?? null,
      guide_category: I.guide_category ?? null,
      target_page: I.target_page ?? _,
      type: I.type ?? "modal",
      trigger_type: x === "automatic" ? "page_load" : "click",
      status: I.status ?? "draft",
      priority: I.priority ?? 0,
      templates: R
    };
    c(""), Ce.current = $?.template_id ?? null;
    try {
      await Y.mutateAsync({ guideId: i, payload: N }), ee(), Ee(!0), setTimeout(() => Ee(!1), 2e3);
    } catch (q) {
      Ce.current = null;
      const D = q instanceof Error ? q.message : "Failed to update guide";
      c(D);
    }
  }, Yn = async () => {
    if (!I || !i) return;
    const _ = Ge(), R = x === "automatic" ? null : g?.xpath ?? (g?.selector?.startsWith("/") || g?.selector?.startsWith("//") ? g?.selector : null) ?? null, N = T.slice().sort((D, ne) => D.step_order - ne.step_order).map((D) => {
      const ne = D.map_id === f;
      let Me = D.x_path;
      ne && (Me = L === "floating" ? null : l || r || D.x_path);
      const ft = !Me;
      return {
        template_id: D.template_id,
        step_order: D.step_order,
        url: ne ? _ : D.url ?? _,
        x_path: Me,
        auto_click_target: ne ? M : D.auto_click_target ?? !1,
        content: ne ? le(de(D), ft) : de(D)
      };
    }), q = {
      guide_name: I.guide_name ?? "",
      description: I.description ?? "",
      target_segment: R,
      guide_category: I.guide_category ?? null,
      target_page: _,
      type: I.type ?? "modal",
      trigger_type: x === "automatic" ? "page_load" : "click",
      status: I.status ?? "draft",
      priority: I.priority ?? 0,
      templates: N
    };
    c("");
    try {
      await Y.mutateAsync({ guideId: i, payload: q }), ee(), qe(!0), setTimeout(() => {
        qe(!1), b(!1);
      }, 1200);
    } catch (D) {
      const ne = D instanceof Error ? D.message : "Failed to update guide";
      c(ne);
    }
  }, Xn = async (_) => {
    if (!I || !i) return;
    const R = Ge(), N = T.slice().sort((D, ne) => D.step_order - ne.step_order).map((D) => ({
      template_id: D.template_id,
      step_order: D.step_order,
      url: D.url ?? R,
      x_path: D.x_path,
      auto_click_target: D.auto_click_target ?? !1,
      content: de(D)
    })), q = {
      guide_name: I.guide_name ?? "",
      description: I.description ?? "",
      target_segment: I.target_segment ?? null,
      guide_category: I.guide_category ?? null,
      target_page: I.target_page ?? R,
      type: I.type ?? "modal",
      trigger_type: I.trigger_type ?? null,
      status: _,
      priority: I.priority ?? 0,
      templates: N
    };
    xe(_), c("");
    try {
      await Y.mutateAsync({ guideId: i, payload: q }), ye(!0), setTimeout(() => ye(!1), 2e3);
    } catch (D) {
      const ne = I.status;
      xe(["draft", "active", "inactive", "archived"].includes(ne) ? ne : "draft");
      const Me = D instanceof Error ? D.message : "Failed to update status";
      c(Me);
    }
  }, _i = !!i && !!I, ht = l || r || $?.x_path || "", vi = g?.xpath ?? g?.selector ?? "";
  return /* @__PURE__ */ s("div", { style: p.root, children: [
    De && $ && /* @__PURE__ */ s(
      Is,
      {
        initialContent: Re ?? de($),
        stepLabel: ve($) || `Step ${Ae + 1}`,
        onSave: (_) => {
          Oe(_), ge(!1), t({ type: "COLLAPSE_FROM_FULLSCREEN" });
        },
        onClose: () => {
          ge(!1), t({ type: "COLLAPSE_FROM_FULLSCREEN" });
        },
        onPreview: (_) => {
          t({
            type: "PREVIEW_CONTENT",
            content: le(_, L === "floating"),
            xpath: B === "banner" ? null : l || $.x_path || null,
            layoutMode: B === "banner" ? "floating" : L,
            position: B === "banner" ? pe : H
          });
        }
      }
    ),
    /* @__PURE__ */ s("div", { style: p.header, children: [
      /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.25rem" }, children: [
        /* @__PURE__ */ s("h2", { style: p.headerTitle, children: y ? "Configure Trigger" : _i ? I?.guide_name ?? "Guide" : "Create Guide" }),
        y && I?.guide_name && /* @__PURE__ */ s("span", { style: { fontSize: "0.75rem", color: "#94a3b8" }, children: [
          'for "',
          I.guide_name,
          '"'
        ] })
      ] }),
      /* @__PURE__ */ s(z, { variant: "icon", onClick: () => t({ type: "CANCEL" }), "aria-label": "Close", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } }) })
    ] }),
    y ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ s(
        z,
        {
          variant: "secondary",
          style: { alignSelf: "flex-start" },
          onClick: () => {
            P(!1), b(!1), A(null), t({ type: "CLEAR_SELECTION_CLICKED" });
          },
          children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left", style: { marginRight: "0.4rem" } }),
            "Back to Steps"
          ]
        }
      ),
      I?.target_segment && /* @__PURE__ */ s("div", { style: p.section, children: [
        /* @__PURE__ */ s("label", { style: p.label, children: "Currently triggers on" }),
        /* @__PURE__ */ s("div", { style: {
          ...p.selectorBox,
          marginTop: "0.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:cursor-default-click", style: { fontSize: "0.9rem", color: "#3b82f6", flexShrink: 0 } }),
          /* @__PURE__ */ s("span", { title: I.target_segment, style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: I.target_segment.length > 55 ? I.target_segment.slice(0, 55) + "…" : I.target_segment })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { style: p.section, children: [
        /* @__PURE__ */ s("label", { style: p.label, children: "When should this guide appear?" }),
        /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }, children: ["automatic", "on_click"].map((_) => {
          const R = x === _;
          return /* @__PURE__ */ s(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: R ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                background: R ? "rgba(59,130,246,0.05)" : "#fff",
                cursor: "pointer"
              },
              children: [
                /* @__PURE__ */ s(
                  "input",
                  {
                    type: "radio",
                    name: "triggerAction",
                    value: _,
                    checked: R,
                    onChange: () => C(_),
                    style: { marginTop: "0.1rem", accentColor: "#3b82f6" }
                  }
                ),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ s("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }, children: _ === "automatic" ? "On page load" : "When an element is clicked" }),
                  /* @__PURE__ */ s("div", { style: { fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.125rem" }, children: _ === "automatic" ? "Guide appears automatically when the page loads" : "Guide appears when a specific element is clicked" })
                ] })
              ]
            },
            _
          );
        }) })
      ] }),
      x === "on_click" && /* @__PURE__ */ s("div", { style: p.section, children: [
        /* @__PURE__ */ s("label", { style: p.label, children: "Which element triggers this guide?" }),
        g ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }, children: [
          /* @__PURE__ */ s("div", { style: {
            padding: "0.75rem",
            border: "1px solid #bbf7d0",
            borderRadius: "0.75rem",
            background: "#f0fdf4"
          }, children: [
            /* @__PURE__ */ s("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#166534" }, children: [
              g.elementInfo?.tagName?.toLowerCase() ?? "element",
              g.elementInfo?.textContent && /* @__PURE__ */ s("span", { style: { fontWeight: 400, color: "#15803d" }, children: [
                " ",
                '· "',
                g.elementInfo.textContent.slice(0, 30),
                '"'
              ] })
            ] }),
            g.elementInfo?.id && /* @__PURE__ */ s("div", { style: { fontSize: "0.7rem", color: "#4ade80", marginTop: "0.125rem" }, children: [
              "#",
              g.elementInfo.id
            ] }),
            /* @__PURE__ */ s("div", { style: { marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#86efac", wordBreak: "break-all" }, children: [
              vi.slice(0, 60),
              vi.length > 60 ? "…" : ""
            ] })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.5rem" }, children: [
            /* @__PURE__ */ s(
              z,
              {
                variant: "secondary",
                style: { flex: 1 },
                onClick: () => {
                  P(!0), t({ type: "ACTIVATE_SELECTOR" });
                },
                children: [
                  /* @__PURE__ */ s("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.3rem" } }),
                  "Change"
                ]
              }
            ),
            O && /* @__PURE__ */ s(
              z,
              {
                variant: "secondary",
                onClick: () => {
                  P(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Done"
              }
            ),
            I?.target_segment && /* @__PURE__ */ s(
              z,
              {
                variant: "secondary",
                style: { borderColor: "#fca5a5", color: "#dc2626" },
                onClick: () => {
                  P(!1), A(null), t({ type: "CLEAR_SELECTION_CLICKED" });
                },
                children: "Clear"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ s(
          z,
          {
            variant: O ? "primary" : "secondary",
            style: { marginTop: "0.25rem" },
            onClick: () => {
              P(!0), t({ type: "ACTIVATE_SELECTOR" });
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.4rem" } }),
              O ? "Click an element on the page…" : "Select element"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ s("div", { style: { ...p.actionRow, marginTop: "0.5rem" }, children: /* @__PURE__ */ s(
        z,
        {
          variant: "primary",
          style: { flex: 1 },
          onClick: Yn,
          disabled: Y.isPending || ze,
          children: Y.isPending ? "Saving…" : ze ? "✓ Trigger saved" : "Save Trigger"
        }
      ) }),
      h && /* @__PURE__ */ s("div", { style: p.errorBox, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
        h
      ] })
    ] }) : (
      /* ── Main Step Editor ── */
      /* @__PURE__ */ s(X, { children: i && _e ? /* @__PURE__ */ s("div", { style: { ...p.emptyState, padding: "2rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "2rem", color: "#3b82f6" } }),
        /* @__PURE__ */ s("p", { style: p.emptyStateText, children: "Loading guide…" })
      ] }) : i && !I ? /* @__PURE__ */ s("div", { style: { ...p.emptyState, padding: "2rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle", style: { fontSize: "2rem", color: "#94a3b8" } }),
        /* @__PURE__ */ s("p", { style: p.emptyStateText, children: "Guide not found." })
      ] }) : _i && oe.length > 0 ? /* @__PURE__ */ s(X, { children: [
        /* @__PURE__ */ s("div", { style: p.section, children: [
          /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ s("label", { style: p.label, children: "Steps" }),
            /* @__PURE__ */ s("span", { style: { fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }, children: [
              Ae + 1,
              " of ",
              oe.length
            ] })
          ] }),
          /* @__PURE__ */ s("div", { style: {
            display: "flex",
            gap: "0.4rem",
            overflowX: "auto",
            paddingBottom: "0.25rem",
            marginTop: "0.4rem"
          }, children: oe.map((_, R) => {
            const N = f === _.map_id, q = ve(_) || `Step ${R + 1}`;
            return /* @__PURE__ */ s(
              "button",
              {
                onClick: () => m(_.map_id),
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "9999px",
                  border: N ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  background: N ? "rgba(59,130,246,0.08)" : "#f8fafc",
                  color: N ? "#1d4ed8" : "#64748b",
                  fontSize: "0.78rem",
                  fontWeight: N ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontFamily: p.root.fontFamily
                },
                children: [
                  /* @__PURE__ */ s("span", { style: { opacity: 0.55, fontSize: "0.7rem" }, children: R + 1 }),
                  q.length > 20 ? q.slice(0, 20) + "…" : q
                ]
              },
              _.map_id
            );
          }) })
        ] }),
        /* @__PURE__ */ s("div", { style: p.section, children: [
          /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }, children: [
            /* @__PURE__ */ s("label", { style: p.label, children: "Guide Status" }),
            Pe && /* @__PURE__ */ s("span", { style: { fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }, children: "✓ Saved" })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.4rem" }, children: zs.map((_) => {
            const R = Qe === _.value;
            return /* @__PURE__ */ s(
              "button",
              {
                onClick: () => Xn(_.value),
                disabled: Y.isPending,
                style: {
                  flex: 1,
                  padding: "0.5rem 0.25rem",
                  borderRadius: "0.625rem",
                  border: `2px solid ${R ? _.border : "#e2e8f0"}`,
                  background: R ? _.bg : "#f8fafc",
                  color: R ? _.color : "#94a3b8",
                  fontSize: "0.72rem",
                  fontWeight: R ? 700 : 500,
                  cursor: Y.isPending ? "not-allowed" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.2rem",
                  transition: "all 0.15s",
                  fontFamily: p.root.fontFamily,
                  opacity: Y.isPending ? 0.6 : 1
                },
                children: [
                  /* @__PURE__ */ s("iconify-icon", { icon: _.icon, style: { fontSize: "1rem" } }),
                  _.label
                ]
              },
              _.value
            );
          }) })
        ] }),
        /* @__PURE__ */ s("div", { style: p.section, children: [
          /* @__PURE__ */ s("label", { style: p.label, children: "Content" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.5rem" }, children: [
            /* @__PURE__ */ s(
              z,
              {
                variant: "secondary",
                style: { flex: 1 },
                onClick: () => {
                  t({ type: "EXPAND_TO_FULLSCREEN" }), ge(!0);
                },
                children: [
                  /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil-outline", style: { marginRight: "0.4rem" } }),
                  "Edit Content"
                ]
              }
            ),
            /* @__PURE__ */ s(
              z,
              {
                variant: "secondary",
                style: { flexShrink: 0 },
                onClick: () => {
                  if (!$) return;
                  const _ = Re ?? de($);
                  t({
                    type: "PREVIEW_CONTENT",
                    content: le(_, L === "floating"),
                    xpath: B === "banner" ? null : l || $.x_path || null,
                    layoutMode: B === "banner" ? "floating" : L,
                    position: B === "banner" ? pe : H
                  });
                },
                title: "Preview on page",
                children: [
                  /* @__PURE__ */ s("iconify-icon", { icon: "mdi:eye-outline", style: { fontSize: "1rem" } }),
                  " Preview"
                ]
              }
            )
          ] }),
          Re && /* @__PURE__ */ s("div", { style: {
            fontSize: "0.72rem",
            color: "#f59e0b",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            marginTop: "0.1rem"
          }, children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:circle", style: { fontSize: "0.5rem" } }),
            "Unsaved content changes — click Save Step to commit"
          ] })
        ] }),
        /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
          /* @__PURE__ */ s("div", { style: p.section, children: [
            /* @__PURE__ */ s("label", { style: p.label, children: "Layout" }),
            /* @__PURE__ */ s(
              "select",
              {
                value: L,
                onChange: (_) => {
                  const R = _.target.value;
                  U(R), R === "floating" ? Je() : !l && !r && !$?.x_path && (P(!0), t({ type: "ACTIVATE_SELECTOR" }));
                },
                style: {
                  width: "100%",
                  marginTop: "0.25rem",
                  padding: "0.625rem 1rem",
                  fontFamily: p.root.fontFamily,
                  fontSize: "0.875rem",
                  color: "#334155",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  background: "#fff",
                  cursor: "pointer"
                },
                children: [
                  /* @__PURE__ */ s("option", { value: "anchored", children: "Anchored to Element (Tooltip)" }),
                  /* @__PURE__ */ s("option", { value: "floating", children: "Floating on Page" })
                ]
              }
            )
          ] }),
          L === "floating" && /* @__PURE__ */ s("div", { style: p.section, children: [
            /* @__PURE__ */ s("label", { style: p.label, children: "Style" }),
            /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.5rem", marginTop: "0.25rem" }, children: ["modal", "banner"].map((_) => {
              const R = B === _;
              return /* @__PURE__ */ s(
                "button",
                {
                  onClick: () => k(_),
                  style: {
                    flex: 1,
                    padding: "0.6rem",
                    borderRadius: "0.75rem",
                    border: `2px solid ${R ? "#3b82f6" : "#e2e8f0"}`,
                    background: R ? "rgba(59,130,246,0.08)" : "#f8fafc",
                    color: R ? "#1d4ed8" : "#94a3b8",
                    fontSize: "0.78rem",
                    fontWeight: R ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.35rem",
                    fontFamily: p.root.fontFamily,
                    transition: "all 0.15s"
                  },
                  children: [
                    /* @__PURE__ */ s(
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
          L === "anchored" ? (
            /* ── Anchored: element picker ── */
            /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem" }, children: [
              /* @__PURE__ */ s("label", { style: p.label, children: "Target Element" }),
              d ? (
                /* State 1: freshly selected from page (has local elementInfo) */
                /* @__PURE__ */ s("div", { style: {
                  position: "relative",
                  padding: "0.75rem",
                  border: "1px solid #bfdbfe",
                  borderRadius: "0.75rem",
                  background: "rgba(239,246,255,0.6)"
                }, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }, children: [
                  /* @__PURE__ */ s("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ s("div", { style: { fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }, children: [
                      /* @__PURE__ */ s("span", { children: d.tagName.toLowerCase() }),
                      d.textContent && /* @__PURE__ */ s("span", { style: { fontWeight: 400, color: "#475569" }, children: [
                        " ",
                        '· "',
                        d.textContent.slice(0, 30),
                        d.textContent.length > 30 ? "…" : "",
                        '"'
                      ] })
                    ] }),
                    d.id && /* @__PURE__ */ s("div", { style: { fontSize: "0.72rem", color: "#93c5fd", marginTop: "0.1rem" }, children: [
                      "#",
                      d.id
                    ] }),
                    /* @__PURE__ */ s("div", { style: { marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#94a3b8", wordBreak: "break-all" }, children: ht.length > 60 ? ht.slice(0, 60) + "…" : ht })
                  ] }),
                  /* @__PURE__ */ s(
                    "button",
                    {
                      onClick: ee,
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
                        fontFamily: p.root.fontFamily
                      },
                      children: [
                        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "0.68rem" } }),
                        "Cancel"
                      ]
                    }
                  )
                ] }) })
              ) : $?.x_path ? (
                /* State 2: saved from API — no local edit in progress */
                /* @__PURE__ */ s("div", { style: {
                  position: "relative",
                  padding: "0.75rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.75rem",
                  background: "#f8fafc"
                }, children: [
                  /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
                    /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.4rem" }, children: [
                      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:check-circle", style: { fontSize: "0.85rem", color: "#22c55e" } }),
                      /* @__PURE__ */ s("span", { style: { fontSize: "0.8rem", fontWeight: 600, color: "#334155" }, children: "Element saved" })
                    ] }),
                    /* @__PURE__ */ s(
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
                          fontFamily: p.root.fontFamily
                        },
                        children: [
                          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:close", style: { fontSize: "0.7rem" } }),
                          "Clear"
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ s("div", { style: { marginTop: "0.35rem", fontFamily: "monospace", fontSize: "0.68rem", color: "#94a3b8", wordBreak: "break-all" }, children: $.x_path.length > 60 ? $.x_path.slice(0, 60) + "…" : $.x_path })
                ] })
              ) : (
                /* State 3: nothing selected yet */
                /* @__PURE__ */ s("div", { style: {
                  padding: "0.75rem",
                  border: "1px solid #fed7aa",
                  borderRadius: "0.75rem",
                  background: "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }, children: [
                  /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle-outline", style: { fontSize: "1rem", color: "#f97316", flexShrink: 0 } }),
                  /* @__PURE__ */ s("span", { style: { fontSize: "0.8rem", color: "#c2410c" }, children: 'No element selected — use "Select Element" below' })
                ] })
              ),
              /* @__PURE__ */ s("div", { style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.625rem 0.75rem",
                border: "1px solid #e2e8f0",
                borderRadius: "0.75rem",
                background: "#fafafa"
              }, children: [
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ s("div", { style: { fontSize: "0.8rem", fontWeight: 600, color: "#334155" }, children: "Auto-click on Next" }),
                  /* @__PURE__ */ s("div", { style: { fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.1rem" }, children: "Clicks this element when user advances" })
                ] }),
                /* @__PURE__ */ s(
                  "button",
                  {
                    onClick: () => G(!M),
                    style: p.toggle(M),
                    "aria-label": "Toggle auto-click",
                    children: /* @__PURE__ */ s("div", { style: p.toggleThumb(M) })
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.5rem" }, children: [
                /* @__PURE__ */ s(
                  z,
                  {
                    variant: O ? "primary" : "secondary",
                    style: { flex: 1 },
                    onClick: () => {
                      P(!0), t({ type: "ACTIVATE_SELECTOR" });
                    },
                    children: [
                      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:cursor-default-click", style: { marginRight: "0.3rem" } }),
                      ht ? "Change Element" : "Select Element"
                    ]
                  }
                ),
                O && /* @__PURE__ */ s(
                  z,
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
          ) : B === "modal" ? (
            /* ── Floating Modal: 3×3 position grid ── */
            /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
              /* @__PURE__ */ s("label", { style: p.label, children: "Position on screen" }),
              /* @__PURE__ */ s("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", marginTop: "0.25rem" }, children: Fs.map((_, R) => {
                if (!_)
                  return /* @__PURE__ */ s("div", {}, R);
                const N = H === _;
                return /* @__PURE__ */ s(
                  "button",
                  {
                    onClick: () => Z(_),
                    title: nn[_],
                    style: {
                      aspectRatio: "1.4 / 1",
                      borderRadius: "0.6rem",
                      border: N ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      background: N ? "rgba(59,130,246,0.08)" : "#f8fafc",
                      color: N ? "#1d4ed8" : "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.15rem",
                      fontFamily: p.root.fontFamily,
                      transition: "all 0.15s"
                    },
                    children: [
                      /* @__PURE__ */ s("span", { style: { fontSize: "1rem", lineHeight: 1 }, children: Ds[_] }),
                      /* @__PURE__ */ s("span", { style: { fontSize: "0.6rem", fontWeight: N ? 700 : 500 }, children: nn[_] })
                    ]
                  },
                  _
                );
              }) })
            ] })
          ) : (
            /* ── Floating Banner: top / bottom picker ── */
            /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.5rem" }, children: [
              /* @__PURE__ */ s("label", { style: p.label, children: "Banner position" }),
              /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.5rem", marginTop: "0.25rem" }, children: ["top", "bottom"].map((_) => {
                const R = pe === _;
                return /* @__PURE__ */ s(
                  "button",
                  {
                    onClick: () => me(_),
                    style: {
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "0.75rem",
                      border: `2px solid ${R ? "#3b82f6" : "#e2e8f0"}`,
                      background: R ? "rgba(59,130,246,0.08)" : "#f8fafc",
                      color: R ? "#1d4ed8" : "#94a3b8",
                      fontSize: "0.78rem",
                      fontWeight: R ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                      fontFamily: p.root.fontFamily,
                      transition: "all 0.15s"
                    },
                    children: [
                      /* @__PURE__ */ s(
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
          /* @__PURE__ */ s("div", { style: { marginTop: "0.25rem" }, children: /* @__PURE__ */ s(
            z,
            {
              variant: "primary",
              style: { width: "100%", height: "42px" },
              onClick: jn,
              disabled: Y.isPending || he,
              children: Y.isPending ? "Saving…" : he ? "✓ Step saved" : "Save Step"
            }
          ) })
        ] }),
        /* @__PURE__ */ s("div", { style: p.actionRow, children: /* @__PURE__ */ s(
          z,
          {
            variant: "secondary",
            style: { flex: 1 },
            onClick: () => b(!0),
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:lightning-bolt", style: { marginRight: "0.4rem", color: "#f59e0b" } }),
              "Set Trigger"
            ]
          }
        ) }),
        h && /* @__PURE__ */ s("div", { style: p.errorBox, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
          h
        ] })
      ] }) : null })
    )
  ] });
}
function it({
  type: t = "text",
  value: e,
  onInput: i,
  placeholder: n,
  id: r,
  style: o,
  disabled: l,
  "aria-label": a
}) {
  const d = o ? { ...p.input, ...o } : p.input;
  return /* @__PURE__ */ s(
    "input",
    {
      type: t,
      value: e,
      onInput: i,
      placeholder: n,
      id: r,
      style: d,
      disabled: l,
      "aria-label": a
    }
  );
}
function Un({
  value: t,
  onInput: e,
  placeholder: i,
  id: n,
  minHeight: r,
  style: o,
  disabled: l,
  "aria-label": a
}) {
  const d = o ? { ...p.textarea, ...o, ...r != null && { minHeight: typeof r == "number" ? `${r}px` : r } } : r != null ? { ...p.textarea, minHeight: typeof r == "number" ? `${r}px` : r } : p.textarea;
  return /* @__PURE__ */ s(
    "textarea",
    {
      value: t,
      onInput: e,
      placeholder: i,
      id: n,
      style: d,
      disabled: l,
      "aria-label": a
    }
  );
}
const Ns = ["pages", "create"];
async function Bs(t) {
  return ae.post("/pages", {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: "active"
  });
}
function Us() {
  return Ke({
    mutationKey: Ns,
    mutationFn: Bs
  });
}
const Ws = ["pages", "update"];
async function Gs({ pageId: t, payload: e }) {
  return ae.put(`/pages/${t}`, {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: e.status ?? "active"
  });
}
function Hs() {
  return Ke({
    mutationKey: Ws,
    mutationFn: Gs
  });
}
const $s = ["pages", "delete"];
async function Vs(t) {
  return ae.delete(`/pages/${t}`);
}
function Ks() {
  return Ke({
    mutationKey: $s,
    mutationFn: Vs
  });
}
const qs = (t) => ["pages", "check-slug", t];
async function Qs(t) {
  return ae.get(`/pages/check-slug?slug=${encodeURIComponent(t)}`);
}
function js(t) {
  return At({
    queryKey: qs(t),
    queryFn: () => Qs(t),
    enabled: !!t,
    retry: 0
  });
}
const Ys = ["pages", "list"];
async function Xs() {
  return ae.get("/pages");
}
function Js() {
  return At({
    queryKey: Ys,
    queryFn: Xs,
    retry: 0
  });
}
const Zs = "designerTaggedPages", bt = ["pages", "check-slug"], Bt = ["pages", "list"];
function xt() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (e.host || e.hostname || "") + (e.pathname || "/") + (e.search || "") + (e.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function St() {
  try {
    const e = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (e.pathname || "/").replace(/^\//, ""), n = e.search || "", r = e.hash || "";
    return "//*/" + i + n + r;
  } catch {
    return "//*/";
  }
}
function eo({ onMessage: t }) {
  const [e, i] = E("overviewUntagged"), [n, r] = E(""), [o, l] = E(""), [a, d] = E(""), [u, h] = E(!1), [c, f] = E("create"), [m, y] = E(""), [b, x] = E(""), [C, g] = E("suggested"), [A, O] = E(""), [P, M] = E(!1), [G, L] = E(null), [U, B] = E(!1), k = ut(), H = Us(), Z = Hs(), pe = Ks(), { data: me, isLoading: Re, isError: Oe } = js(n), { data: De, isLoading: ge } = Js(), he = !!n && Re, Ee = H.isPending || Z.isPending, ze = (n || "").trim().toLowerCase(), Pe = (De?.data ?? []).filter((T) => (T.slug || "").trim().toLowerCase() === ze).filter(
    (T) => (T.name || "").toLowerCase().includes(a.toLowerCase().trim())
  ), ye = be(() => {
    i("overviewUntagged"), l(xt() || "(current page)"), h(!1), k.invalidateQueries({ queryKey: bt });
  }, [k]), Qe = be(() => {
    i("taggedPagesDetailView"), d("");
  }, []), xe = be(() => {
    L(null), i("tagPageFormView"), h(!0), O(St()), y(""), x(""), f("create"), g("suggested"), M(!1);
  }, []), Ce = be((T) => {
    L(T.page_id), i("tagPageFormView"), h(!0), O(T.slug || St()), y(T.name || ""), x(T.description || ""), f("create"), g("suggested"), M(!1);
  }, []);
  te(() => {
    t({ type: "EDITOR_READY" });
  }, []), te(() => {
    r(St()), l(xt() || "(current page)");
  }, []), te(() => {
    if (!n) {
      i("overviewUntagged");
      return;
    }
    if (Oe) {
      (e === "overviewTagged" || e === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    me !== void 0 && (e === "overviewTagged" || e === "overviewUntagged") && i(me.exists ? "overviewTagged" : "overviewUntagged");
  }, [n, me, Oe, e]), te(() => {
    let T = xt();
    const Y = () => {
      const ve = xt();
      ve !== T && (T = ve, r(St()), l(ve || "(current page)"), i("overviewUntagged"));
    }, oe = () => Y(), $ = () => Y();
    window.addEventListener("hashchange", oe), window.addEventListener("popstate", $);
    const Ae = setInterval(Y, 1500);
    return () => {
      window.removeEventListener("hashchange", oe), window.removeEventListener("popstate", $), clearInterval(Ae);
    };
  }, []);
  const je = async () => {
    const T = m.trim();
    if (!T) {
      M(!0);
      return;
    }
    M(!1);
    const Y = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, oe = A.trim() || Y || "/";
    try {
      if (G)
        await Z.mutateAsync({
          pageId: G,
          payload: {
            name: T,
            slug: oe,
            description: b.trim() || void 0,
            status: "active"
          }
        }), L(null), k.invalidateQueries({ queryKey: bt }), k.invalidateQueries({ queryKey: Bt }), ye();
      else {
        const $ = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, Ae = A.trim() || $;
        await H.mutateAsync({
          name: T,
          slug: oe,
          description: b.trim() || void 0
        });
        const ve = Zs, Je = localStorage.getItem(ve) || "[]", S = JSON.parse(Je);
        S.push({ pageName: T, url: Ae }), localStorage.setItem(ve, JSON.stringify(S)), k.invalidateQueries({ queryKey: bt }), k.invalidateQueries({ queryKey: Bt }), i("overviewTagged"), h(!1);
      }
    } catch {
    }
  }, _e = async (T) => {
    if (window.confirm("Delete this page?"))
      try {
        await pe.mutateAsync(T), k.invalidateQueries({ queryKey: bt }), k.invalidateQueries({ queryKey: Bt });
      } catch {
      }
  }, I = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return U ? /* @__PURE__ */ s("div", { style: { ...p.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: p.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...p.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(z, { variant: "icon", title: "Expand", onClick: () => B(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: p.panel, children: [
    /* @__PURE__ */ s("div", { style: p.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...p.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(z, { variant: "icon", title: "Minimize", onClick: () => B(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: p.panelBody, children: [
      he && (e === "overviewTagged" || e === "overviewUntagged") && /* @__PURE__ */ s("div", { style: { ...I, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Checking page…" })
      ] }),
      !he && e === "overviewTagged" && /* @__PURE__ */ s("div", { style: I, children: [
        /* @__PURE__ */ s("div", { style: p.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ s("div", { style: { ...p.card, marginBottom: "1rem", cursor: "pointer" }, onClick: Qe, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("span", { style: { ...p.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ s("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: o })
            ] })
          ] }),
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ s(z, { variant: "primary", style: { width: "100%" }, onClick: xe, children: "Tag Page" })
      ] }),
      e === "taggedPagesDetailView" && /* @__PURE__ */ s("div", { style: I, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: p.link,
            onClick: (T) => {
              T.preventDefault(), ye();
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ s("span", { style: { ...p.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: ge ? "…" : Pe.length }),
          /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ s("div", { style: p.searchWrap, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: p.searchIcon }),
          /* @__PURE__ */ s(
            it,
            {
              type: "text",
              placeholder: "Search Pages",
              value: a,
              onInput: (T) => d(T.target.value),
              style: p.searchInput
            }
          ),
          a && /* @__PURE__ */ s(z, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => d(""), children: "Clear" })
        ] }),
        ge ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ s("span", { children: "Loading pages…" })
        ] }) : Pe.map((T) => /* @__PURE__ */ s("div", { style: { ...p.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: T.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ s(z, { variant: "iconSm", title: "Edit", onClick: () => Ce(T), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ s(z, { variant: "iconSm", title: "Delete", onClick: () => _e(T.page_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, T.page_id)),
        /* @__PURE__ */ s(z, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: xe, children: "Tag Page" })
      ] }),
      !he && e === "overviewUntagged" && /* @__PURE__ */ s("div", { style: { ...I, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ s("div", { style: { ...p.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ s(z, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: xe, children: "Tag Page" })
      ] }),
      e === "tagPageFormView" && /* @__PURE__ */ s("div", { style: { ...I, gap: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          "a",
          {
            href: "#",
            style: p.link,
            onClick: (T) => {
              T.preventDefault(), L(null), ye(), h(!1);
            },
            children: [
              /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back"
            ]
          }
        ),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: p.sectionLabel, children: G ? "EDIT PAGE" : "PAGE SETUP" }),
          !G && /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "pageSetup", value: "create", checked: c === "create", onChange: () => f("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create New Page" })
            ] }),
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "pageSetup", value: "merge", checked: c === "merge", onChange: () => f("merge"), style: { accentColor: "#3b82f6" } }),
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
                it,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: m,
                  onInput: (T) => y(T.target.value)
                }
              ),
              P && /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ s(
                Un,
                {
                  placeholder: "Click to add description",
                  value: b,
                  onInput: (T) => x(T.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: { ...p.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "INCLUDE PAGE RULES",
            /* @__PURE__ */ s("span", { style: { color: "#94a3b8" }, title: "Define how this page is identified", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }, children: [
            /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#334155" }, children: "Include Rule 1" }),
            /* @__PURE__ */ s(z, { variant: "iconSm", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "suggested", checked: C === "suggested", onChange: () => g("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "exact", checked: C === "exact", onChange: () => g("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "ruleType", value: "builder", checked: C === "builder", onChange: () => g("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ s(it, { type: "text", placeholder: "e.g. //*/path/to/page", value: A, onInput: (T) => O(T.target.value) })
          ] })
        ] })
      ] })
    ] }),
    u && /* @__PURE__ */ s("div", { style: p.footer, children: [
      /* @__PURE__ */ s(
        z,
        {
          variant: "secondary",
          onClick: () => {
            L(null), ye();
          },
          disabled: Ee,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ s(z, { variant: "primary", style: { flex: 1 }, onClick: je, disabled: Ee, children: Ee ? /* @__PURE__ */ s(X, { children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        G ? "Updating…" : "Saving…"
      ] }) : G ? "Update" : "Save" })
    ] })
  ] });
}
const to = ["features", "create"];
async function io(t) {
  return ae.post("/features", t);
}
function no() {
  return Ke({
    mutationKey: to,
    mutationFn: io
  });
}
const ro = ["features", "update"];
async function so({
  featureId: t,
  payload: e
}) {
  return ae.put(`/features/${t}`, e);
}
function oo() {
  return Ke({
    mutationKey: ro,
    mutationFn: so
  });
}
const ao = ["features", "delete"];
async function lo(t) {
  return ae.delete(`/features/${t}`);
}
function co() {
  return Ke({
    mutationKey: ao,
    mutationFn: lo
  });
}
const tt = ["features", "list"];
async function uo() {
  const t = await ae.get("/features");
  return Array.isArray(t) ? { data: t } : t;
}
function ho() {
  return At({
    queryKey: tt,
    queryFn: uo,
    retry: 0
  });
}
const rn = "designerHeatmapEnabled";
function fo({ onMessage: t, elementSelected: e }) {
  const [i, n] = E("overview"), [r, o] = E(!1), [l, a] = E(""), [d, u] = E(null), [h, c] = E(""), [f, m] = E(!1), [y, b] = E(!1), [x, C] = E(!1), [g, A] = E(!1), [O, P] = E(!1), [M, G] = E("create"), [L, U] = E("suggested"), [B, k] = E(""), [H, Z] = E(""), [pe, me] = E(null), [Re, Oe] = E(null), [De, ge] = E(""), he = ut(), Ee = no(), ze = oo(), qe = co(), { data: Pe, isLoading: ye } = ho(), Qe = Ee.isPending || ze.isPending || qe.isPending, xe = Pe?.data ?? [], Ce = xe.length, je = xe.filter((S) => (S.name || "").toLowerCase().includes(De.toLowerCase().trim())).sort((S, ee) => (S.name || "").localeCompare(ee.name || "", void 0, { sensitivity: "base" })), _e = be(() => {
    n("overview"), o(!1), a(""), u(null), Z(""), c(""), m(!1), me(null), ge(""), he.invalidateQueries({ queryKey: tt });
  }, [he]), I = be(() => {
    n("taggedList"), ge("");
  }, []), T = be((S) => S.rules?.find(
    (le) => le.selector_type === "xpath" && (le.selector_value ?? "").trim() !== ""
  )?.selector_value ?? "", []), Y = be(
    (S) => {
      n("form"), o(!0), S ? (me(S.feature_id), c(S.name || ""), k(S.description || ""), Z(T(S)), U("exact")) : (me(null), c(""), k(""), Z(e?.xpath || ""), a(e?.selector || ""), u(e?.elementInfo || null)), m(!1);
    },
    [e, T]
  );
  te(() => {
    t({ type: "EDITOR_READY" });
  }, []), te(() => {
    t({ type: "FEATURES_FOR_HEATMAP", features: Pe?.data ?? [] });
  }, [Pe, t]), te(() => {
    const S = localStorage.getItem(rn) === "true";
    b(S);
  }, []), te(() => {
    e ? (a(e.selector), u(e.elementInfo), Z(e.xpath || ""), o(!0), n("form"), c(""), m(!1), G("create"), k(""), U("exact")) : _e();
  }, [e]);
  const oe = () => {
    const S = !y;
    b(S);
    try {
      localStorage.setItem(rn, String(S));
    } catch {
    }
    t({ type: "HEATMAP_TOGGLE", enabled: S });
  }, $ = (S) => S.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""), Ae = async () => {
    const S = h.trim();
    if (!S) {
      m(!0);
      return;
    }
    m(!1);
    const ee = H || e?.xpath || "";
    if (L === "exact") {
      if (!ee) return;
      const le = {
        name: S,
        slug: $(S),
        description: B.trim() || "",
        status: "active",
        rules: [
          {
            selector_type: "xpath",
            selector_value: ee,
            match_mode: "exact",
            priority: 10,
            is_active: !0
          }
        ]
      };
      try {
        pe ? (await ze.mutateAsync({ featureId: pe, payload: le }), he.invalidateQueries({ queryKey: tt }), _e()) : (await Ee.mutateAsync(le), he.invalidateQueries({ queryKey: tt }), _e());
      } catch {
      }
      return;
    }
  }, ve = async (S) => {
    if (window.confirm("Delete this feature?")) {
      Oe(S);
      try {
        await qe.mutateAsync(S), he.invalidateQueries({ queryKey: tt }), pe === S && (me(null), _e());
      } catch {
      } finally {
        Oe(null);
      }
    }
  }, Je = (S) => {
    const ee = [];
    S.tagName && ee.push(`Tag: ${S.tagName}`), S.id && ee.push(`ID: ${S.id}`), S.className && ee.push(`Class: ${S.className}`);
    const le = (S.textContent || "").slice(0, 80);
    return le && ee.push(`Text: ${le}`), ee.join(" | ");
  };
  return x ? /* @__PURE__ */ s("div", { style: { ...p.panel, padding: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: p.panelHeader, children: [
    /* @__PURE__ */ s("h2", { style: { ...p.headerTitle, fontSize: "1.125rem" }, children: r ? "Tag Feature" : "Tag Features" }),
    /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(z, { variant: "icon", title: "Expand", onClick: () => C(!1), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ s("div", { style: p.panel, children: [
    /* @__PURE__ */ s("div", { style: p.panelHeader, children: [
      /* @__PURE__ */ s("h2", { style: { ...p.headerTitle, fontSize: "1.125rem" }, children: "Tag Features" }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ s(z, { variant: "icon", title: "Minimize", onClick: () => C(!0), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: r ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ s("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem" }, children: /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" }, children: [
        /* @__PURE__ */ s("a", { href: "#", style: p.link, onClick: (S) => {
          S.preventDefault(), _e();
        }, children: [
          /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back"
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: p.sectionLabel, children: "FEATURE SETUP" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: M === "create", onChange: () => G("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create new Feature" })
            ] }),
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureSetup", checked: M === "merge", onChange: () => G("merge"), style: { accentColor: "#3b82f6" } }),
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
                it,
                {
                  type: "text",
                  placeholder: "e.g. report-designer-data-table-grid Link",
                  value: h,
                  onInput: (S) => c(S.target.value)
                }
              ),
              f && /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ s("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a feature name."
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ s(
                Un,
                {
                  placeholder: "Describe your Feature",
                  value: B,
                  onInput: (S) => k(S.target.value),
                  minHeight: "5rem"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ s("div", { style: { ...p.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "FEATURE ELEMENT MATCHING",
            /* @__PURE__ */ s("span", { style: { color: "#94a3b8" }, title: "Match the element for this feature", children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: L === "suggested", onChange: () => U("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested match" })
            ] }),
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: L === "ruleBuilder", onChange: () => U("ruleBuilder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule builder" })
            ] }),
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: L === "customCss", onChange: () => U("customCss"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Custom CSS" })
            ] }),
            /* @__PURE__ */ s("label", { style: p.radioLabel, children: [
              /* @__PURE__ */ s("input", { type: "radio", name: "featureMatch", checked: L === "exact", onChange: () => U("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact match" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: L === "exact" ? "XPath" : "Selection" }),
            /* @__PURE__ */ s("div", { style: p.selectorBox, children: L === "exact" ? (e?.xpath ?? H) || "-" : (e?.selector ?? l) || "-" })
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
                onClick: () => P((S) => !S),
                "aria-expanded": O,
                children: [
                  /* @__PURE__ */ s("label", { style: { ...p.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                  /* @__PURE__ */ s(
                    "iconify-icon",
                    {
                      icon: O ? "mdi:chevron-up" : "mdi:chevron-down",
                      style: { fontSize: "1.125rem", color: "#64748b", flexShrink: 0 }
                    }
                  )
                ]
              }
            ),
            O && /* @__PURE__ */ s("div", { style: { ...p.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ s("div", { style: p.elementInfoText, children: Je(d) }) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ s("div", { style: p.footer, children: [
        /* @__PURE__ */ s(z, { variant: "secondary", onClick: _e, children: "Cancel" }),
        /* @__PURE__ */ s(z, { variant: "primary", style: { flex: 1 }, onClick: Ae, disabled: Qe, children: Qe ? "Saving..." : "Save" })
      ] })
    ] }) : /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: i === "taggedList" ? /* @__PURE__ */ s(X, { children: [
      /* @__PURE__ */ s(
        "a",
        {
          href: "#",
          style: p.link,
          onClick: (S) => {
            S.preventDefault(), _e();
          },
          children: [
            /* @__PURE__ */ s("iconify-icon", { icon: "mdi:arrow-left" }),
            " Back to overview"
          ]
        }
      ),
      /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
        /* @__PURE__ */ s("span", { style: { ...p.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: ye ? "…" : je.length }),
        /* @__PURE__ */ s("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Tagged Features" })
      ] }),
      /* @__PURE__ */ s("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged features" }),
      /* @__PURE__ */ s("div", { style: p.searchWrap, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:magnify", style: p.searchIcon }),
        /* @__PURE__ */ s(
          it,
          {
            type: "text",
            placeholder: "Search features",
            value: De,
            onInput: (S) => ge(S.target.value),
            style: p.searchInput
          }
        ),
        De && /* @__PURE__ */ s(z, { variant: "ghost", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }, onClick: () => ge(""), children: "Clear" })
      ] }),
      ye ? /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
        /* @__PURE__ */ s("span", { children: "Loading features…" })
      ] }) : je.map((S) => {
        const ee = Re === S.feature_id;
        return /* @__PURE__ */ s("div", { style: { ...p.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: S.name || "Unnamed" }),
          /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.25rem", alignItems: "center" }, children: [
            /* @__PURE__ */ s(z, { variant: "iconSm", title: "Edit", onClick: () => Y(S), disabled: ee, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:pencil" }) }),
            ee ? /* @__PURE__ */ s("span", { style: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", color: "#64748b" } }) }) : /* @__PURE__ */ s(z, { variant: "iconSm", title: "Delete", onClick: () => ve(S.feature_id), children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, S.feature_id);
      }),
      /* @__PURE__ */ s(z, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: () => Y(), children: "Tag Feature" })
    ] }) : ye ? /* @__PURE__ */ s("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
      /* @__PURE__ */ s("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.75rem" } }),
      /* @__PURE__ */ s("span", { children: "Loading features…" })
    ] }) : /* @__PURE__ */ s(X, { children: [
      /* @__PURE__ */ s("div", { style: p.sectionLabel, children: "FEATURES OVERVIEW" }),
      /* @__PURE__ */ s("div", { style: { ...p.card, marginBottom: "0.75rem" }, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("span", { style: { ...p.badge, background: "#14b8a6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: "0" }),
          /* @__PURE__ */ s("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Suggested Features" }),
            /* @__PURE__ */ s("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of untagged elements on this page" })
          ] })
        ] }),
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ s("div", { style: { ...p.card, marginBottom: "0.75rem", cursor: "pointer" }, onClick: I, children: /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ s("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ s("span", { style: { ...p.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: Ce }),
          /* @__PURE__ */ s("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ s("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Tagged Features" }),
            /* @__PURE__ */ s("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of tagged Features on this page" })
          ] })
        ] }),
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
      ] }) }),
      /* @__PURE__ */ s("div", { style: p.heatmapRow, children: [
        /* @__PURE__ */ s("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Heatmap" }),
        /* @__PURE__ */ s("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
          /* @__PURE__ */ s(
            "button",
            {
              role: "switch",
              tabIndex: 0,
              style: p.toggle(y),
              onClick: oe,
              onKeyDown: (S) => S.key === "Enter" && oe(),
              children: /* @__PURE__ */ s("span", { style: p.toggleThumb(y) })
            }
          ),
          /* @__PURE__ */ s(z, { variant: "icon", style: { border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ s("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
        /* @__PURE__ */ s(
          z,
          {
            variant: g ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              A(!0), t({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Re-Select"
          }
        ),
        /* @__PURE__ */ s(
          z,
          {
            variant: "secondary",
            style: g ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              A(!1), t({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Hide Selector"
          }
        )
      ] })
    ] }) }) })
  ] });
}
const po = new Qr({
  defaultOptions: { mutations: { retry: 0 } }
});
class mo {
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
      z-index: ${v.zIndex.editor};
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
    const n = (o) => {
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
    }, r = this.mode === "tag-page" ? /* @__PURE__ */ s(eo, { onMessage: n }) : this.mode === "tag-feature" ? /* @__PURE__ */ s(
      fo,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    ) : /* @__PURE__ */ s(
      Ms,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState,
        guideId: this.guideId,
        templateId: this.templateId
      }
    );
    Le(
      /* @__PURE__ */ s(as, { client: po, children: r }),
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
  <style>${vs}</style>
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
      z-index: ${v.zIndex.controls};
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
      const u = Math.abs(e.clientX - this.mouseDownX), h = Math.abs(e.clientY - this.mouseDownY);
      if (Math.sqrt(u * u + h * h) > this.dragThreshold)
        this.isDragging = !0, document.body.style.cursor = "grabbing", document.documentElement.style.cursor = "grabbing", document.body.style.userSelect = "none", document.documentElement.style.userSelect = "none", this.iframe && (this.iframe.style.pointerEvents = "none"), this.gripButton && (this.gripButton.style.cursor = "grabbing");
      else
        return;
    }
    e.preventDefault(), e.stopPropagation();
    const i = e.clientX - this.dragStartX, n = e.clientY - this.dragStartY, r = window.innerWidth, o = window.innerHeight, l = this.iframe.offsetWidth, a = Math.max(-l + 50, Math.min(i, r - 50)), d = Math.max(0, Math.min(n, o - 100));
    this.iframe.style.left = `${a}px`, this.iframe.style.top = `${d}px`, this.iframe.style.right = "auto", this.iframe.style.bottom = "auto", this.dragHandle.style.left = `${a}px`, this.dragHandle.style.top = `${d}px`;
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
const go = "visual-designer-guides", sn = "1.0.0";
class yo {
  storageKey;
  constructor(e = go) {
    this.storageKey = e;
  }
  getGuides() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const i = JSON.parse(e);
      return i.version !== sn ? (this.clear(), []) : i.guides || [];
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
    const i = { guides: e, version: sn };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(e) {
    return this.getGuides().find((i) => i.id === e) || null;
  }
}
function _o({ onExit: t }) {
  const e = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: v.bg,
    border: `2px solid ${v.primary}`,
    borderRadius: v.borderRadius,
    color: v.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: v.fontFamily,
    cursor: "pointer",
    zIndex: String(v.zIndex.controls),
    boxShadow: v.shadow,
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
        i.currentTarget.style.background = v.primary, i.currentTarget.style.color = v.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = v.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = v.bg, i.currentTarget.style.color = v.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = v.shadow;
      },
      children: [
        /* @__PURE__ */ s("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function vo() {
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
        border: `5px solid ${v.primary}`,
        pointerEvents: "none",
        zIndex: v.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function bo() {
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
        background: v.primary,
        color: v.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: v.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${v.primary}`,
        borderTop: "none",
        zIndex: v.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function xo() {
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
        zIndex: v.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: v.fontFamily,
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
                    borderTopColor: v.primary,
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
function So(t) {
  return /* @__PURE__ */ s(X, { children: [
    t.showExitButton && /* @__PURE__ */ s(_o, { onExit: t.onExitEditor }),
    t.showRedBorder && /* @__PURE__ */ s(vo, {}),
    t.showBadge && /* @__PURE__ */ s(bo, {}),
    t.showLoading && /* @__PURE__ */ s(xo, {})
  ] });
}
function wo(t, e) {
  Le(/* @__PURE__ */ s(So, { ...e }), t);
}
class Wn {
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
    this.config = e, this.guideId = e.guideId ?? null, this.templateId = e.templateId ?? null, this.storage = new yo(e.storageKey), this.editorMode = new er(), this.guideRenderer = new Sr(), this.featureHeatmapRenderer = new Er(), this.editorFrame = new mo();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((i, n) => {
      const r = {
        guide_id: i.guide_id,
        step_index: n
      }, a = [...(i.templates || []).filter((d) => d.is_active)].sort((d, u) => d.step_order - u.step_order)[n];
      return a && (r.template_id = a.template_id, r.template_key = a.template.template_key, r.step_order = a.step_order, r.xpath = a.x_path), this.config.onGuideDismissed?.(i.guide_id), this.trackEvent("dismissed", r);
    }), this.guideRenderer.setOnPollResponse((i, n, r, o, l, a, d) => {
      this.trackEvent("poll_responses", {
        guide_id: i.guide_id,
        template_id: n,
        block_id: r,
        step_index: d,
        survey_question: l,
        survey_response: a,
        survey_type: o
      });
    }), this.guideRenderer.setOnNext((i, n, r) => {
      const a = [...(i.templates || []).filter((d) => d.is_active)].sort((d, u) => d.step_order - u.step_order)[n];
      if (a) {
        const d = n === r - 1;
        let u = "middle";
        n === 0 ? u = "first" : d && (u = "last");
        const h = {
          guide_id: i.guide_id,
          template_id: a.template_id,
          map_id: a.map_id,
          step_order: a.step_order,
          template_key: a.template.template_key,
          guide_step: u,
          xpath: a.x_path
        };
        return d && this.trackEvent("completed", h), this.trackEvent("viewed", h);
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
    return this.storage.getGuidesByPage(Ge());
  }
  saveGuide(e) {
    const i = {
      ...e,
      id: xi(),
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
      const e = Ge(), i = await ae.get(`/guides?target_page=${encodeURIComponent(e)}`);
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
      const l = this._getStorageItem("__rg_session_start");
      if (l) {
        const h = new Date(l).getTime();
        isNaN(h) || (o = Date.now() - h);
      }
      const d = (this._getStorageItem("__rg_visitor_traits") || {}).email || null, u = e.map((h) => {
        const c = h.properties || {};
        return {
          event_id: "evt_" + xi(),
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
          element_id: c.element_id || c.xpath || null,
          guide_id: c.guide_id || null,
          properties: c
        };
      });
      console.log("[Visual Designer] Tracking Batch:", u), await ae.post("/guide-events", {
        events: u
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
    const n = Se.getXPath(i);
    for (const r of this.fetchedGuides)
      r.target_segment !== null && r.target_segment === n && (this.trackEvent("triggered", {
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
      page: Ge()
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
  handlePreviewContent(e) {
    const i = {
      guide_id: "__preview__",
      guide_name: "Preview",
      description: null,
      target_segment: null,
      guide_category: null,
      target_page: null,
      type: e.layoutMode === "anchored" ? "tooltip" : "modal",
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
        const n = JSON.parse(e.content || "{}");
        n.layout || (n.layout = {}), n.layout.position = e.position, i.templates[0].content = JSON.stringify(n), i.templates[0].template.content = JSON.stringify(n);
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
      z-index: ${v.zIndex.controls};
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
    this.ensureSDKRoot(), this.sdkRoot && wo(this.sdkRoot, {
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
const mi = "1.0.0", Gn = "rg-web-sdk", Eo = "web", Co = 1, W = {
  VISITOR_ID: "__rg_visitor_id",
  ACCOUNT_ID: "__rg_account_id",
  SESSION_ID: "__rg_session_id",
  SESSION_START: "__rg_session_start",
  SESSION_LAST_ACTIVITY: "__rg_session_last_activity",
  EVENT_QUEUE: "__rg_event_queue",
  OPT_OUT: "__rg_opt_out",
  VISITOR_TRAITS: "__rg_visitor_traits",
  ACCOUNT_TRAITS: "__rg_account_traits"
}, Io = {
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
}, Ne = {
  PAGE_VIEW: "page_view",
  CLICK: "click",
  INPUT: "input",
  SCROLL: "scroll",
  ERROR: "error"
}, Be = {
  NAVIGATION: "navigation",
  ENGAGEMENT: "engagement",
  DIAGNOSTIC: "diagnostic"
}, nt = {
  NORMAL: "normal",
  RAGE_CLICK: "rage_click",
  ERROR_CLICK: "error_click",
  U_TURN: "u_turn"
}, Ze = {
  rageClickThreshold: 3,
  rageClickWindow: 1e3,
  deadClickDelay: 300,
  errorClickWindow: 2e3,
  uturnThreshold: 5e3
}, Ut = [1e3, 2e3, 5e3, 1e4, 3e4], on = 5, ko = 1e3, To = 100, Ro = {
  click: { limit: 100, window: 1e3 },
  scroll: { limit: 10, window: 1e3 },
  input: { limit: 50, window: 1e3 }
}, Wt = {
  pageView: 100,
  scroll: 500
}, et = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
};
function rt() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (t) => {
    const e = Math.random() * 16 | 0;
    return (t === "x" ? e : e & 3 | 8).toString(16);
  });
}
function st() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function Oo() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function Po() {
  const t = navigator.userAgent;
  return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(t) ? "tablet" : /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silfae|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(t) ? "mobile" : "desktop";
}
function Ao() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Chrome") > -1 && t.indexOf("Edg") === -1 ? (e = "Chrome", i = t.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Safari") > -1 && t.indexOf("Chrome") === -1 ? (e = "Safari", i = t.match(/Version\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Firefox") > -1 ? (e = "Firefox", i = t.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown") : t.indexOf("Edg") > -1 ? (e = "Edge", i = t.match(/Edg\/([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("MSIE") > -1 || t.indexOf("Trident") > -1) && (e = "Internet Explorer", i = t.match(/(?:MSIE |rv:)([\d.]+)/)?.[1] || "Unknown"), { browserName: e, browserVersion: i };
}
function Lo() {
  const t = navigator.userAgent;
  let e = "Unknown", i = "Unknown";
  return t.indexOf("Win") > -1 ? (e = "Windows", t.indexOf("Windows NT 10.0") > -1 ? i = "10" : t.indexOf("Windows NT 6.3") > -1 ? i = "8.1" : t.indexOf("Windows NT 6.2") > -1 ? i = "8" : t.indexOf("Windows NT 6.1") > -1 && (i = "7")) : t.indexOf("Mac") > -1 ? (e = "macOS", i = t.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown") : t.indexOf("Linux") > -1 ? e = "Linux" : t.indexOf("Android") > -1 ? (e = "Android", i = t.match(/Android ([\d.]+)/)?.[1] || "Unknown") : (t.indexOf("iOS") > -1 || t.indexOf("iPhone") > -1 || t.indexOf("iPad") > -1) && (e = "iOS", i = t.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "Unknown"), { osName: e, osVersion: i };
}
function Fo() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Unknown";
  }
}
function Do(t) {
  try {
    const e = new URL(t), i = {};
    return e.searchParams.forEach((n, r) => {
      i[r] = n;
    }), i;
  } catch {
    return {};
  }
}
function ti(t, e = 200) {
  return t ? t.length > e ? t.substring(0, e) : t : null;
}
function ii(t, ...e) {
  return Object.assign({}, t, ...e);
}
function an(t, e) {
  let i;
  return function(...r) {
    const o = () => {
      clearTimeout(i), t(...r);
    };
    clearTimeout(i), i = setTimeout(o, e);
  };
}
function zo(t, e = null) {
  try {
    return JSON.parse(t);
  } catch {
    return e;
  }
}
function Gt(t, e = null) {
  try {
    return JSON.stringify(t);
  } catch {
    return e;
  }
}
function w(t, ...e) {
  typeof console < "u" && console[t] && console[t]("[RG SDK]", ...e);
}
function Mo(t) {
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
function No(t) {
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
function Bo(t) {
  if (!t) return null;
  const e = t.getAttribute("aria-label") || t.getAttribute("alt") || t.getAttribute("title") || (t.tagName === "INPUT" ? t.value : null) || t.textContent?.trim() || null;
  return ti(e, 200);
}
function Uo(t) {
  if (!t) return !1;
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0";
}
class Wo {
  constructor(e = "localStorage") {
    this.preferredStorage = e, this.storageType = this._detectAvailableStorage(), this.memoryStorage = {};
  }
  _detectAvailableStorage() {
    return this.preferredStorage === "localStorage" && this._testStorage(window.localStorage) ? "localStorage" : this._testStorage(window.sessionStorage) ? "sessionStorage" : (w("warn", "No persistent storage available, using in-memory storage"), "memory");
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
      const n = this._getStorage(), r = Gt(i);
      return r ? (n ? n.setItem(e, r) : this.memoryStorage[e] = r, !0) : (w("warn", "Failed to serialize value for key:", e), !1);
    } catch (n) {
      if (n.name === "QuotaExceededError") {
        w("warn", "Storage quota exceeded, attempting cleanup"), this._cleanup();
        try {
          const r = this._getStorage();
          return r ? r.setItem(e, Gt(i)) : this.memoryStorage[e] = Gt(i), !0;
        } catch (r) {
          return w("error", "Failed to set item after cleanup:", e, r), !1;
        }
      }
      return w("error", "Failed to set item:", e, n), !1;
    }
  }
  getItem(e) {
    try {
      const i = this._getStorage();
      let n;
      return i ? n = i.getItem(e) : n = this.memoryStorage[e], n == null ? null : zo(n, null);
    } catch (i) {
      return w("error", "Failed to get item:", e, i), null;
    }
  }
  removeItem(e) {
    try {
      const i = this._getStorage();
      return i ? i.removeItem(e) : delete this.memoryStorage[e], !0;
    } catch (i) {
      return w("error", "Failed to remove item:", e, i), !1;
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
      return w("error", "Failed to clear storage:", e), !1;
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
        w("error", "Cleanup failed:", i);
      }
  }
  getStorageType() {
    return this.storageType;
  }
  isPersistent() {
    return this.storageType !== "memory";
  }
}
class Go {
  constructor(e, i) {
    this.storage = e, this.config = i, this.visitorId = null, this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this.sessionId = null, this.sessionStartTime = null, this.sessionLastActivity = null, this.sessionEventCount = 0, this.sessionProperties = {}, this.pendingIdentity = null;
  }
  initialize() {
    this._loadVisitor(), this._loadAccount(), this._loadOrCreateSession(), this.pendingIdentity && (this.identify(this.pendingIdentity.visitor, this.pendingIdentity.account), this.pendingIdentity = null), w("info", "Identity initialized:", {
      visitorId: this.visitorId,
      accountId: this.accountId,
      sessionId: this.sessionId
    });
  }
  _loadVisitor() {
    const e = this.storage.getItem(W.VISITOR_ID), i = this.storage.getItem(W.VISITOR_TRAITS) || {};
    e ? (this.visitorId = e, this.visitorTraits = i) : (this.visitorId = "anon_" + rt(), this._persistVisitor());
  }
  _loadAccount() {
    const e = this.storage.getItem(W.ACCOUNT_ID), i = this.storage.getItem(W.ACCOUNT_TRAITS) || {};
    e && (this.accountId = e, this.accountTraits = i);
  }
  _loadOrCreateSession() {
    const e = this.storage.getItem(W.SESSION_ID), i = this.storage.getItem(W.SESSION_START), n = this.storage.getItem(W.SESSION_LAST_ACTIVITY), r = Date.now(), o = this.config.sessionTimeout * 60 * 1e3;
    if (e && n && r - new Date(n).getTime() < o) {
      this.sessionId = e, this.sessionStartTime = i, this.sessionLastActivity = n, this._updateSessionActivity();
      return;
    }
    this._createNewSession();
  }
  _createNewSession() {
    this.sessionId = "sess_" + rt(), this.sessionStartTime = st(), this.sessionLastActivity = st(), this.sessionEventCount = 0, this._captureSessionProperties(), this._persistSession(), w("info", "New session created:", this.sessionId);
  }
  _captureSessionProperties() {
    const e = window.location.href, i = Do(e);
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
    this.sessionLastActivity = st(), this.sessionEventCount++, this.storage.setItem(W.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  _persistVisitor() {
    this.storage.setItem(W.VISITOR_ID, this.visitorId), this.storage.setItem(W.VISITOR_TRAITS, this.visitorTraits);
  }
  _persistAccount() {
    this.accountId && (this.storage.setItem(W.ACCOUNT_ID, this.accountId), this.storage.setItem(W.ACCOUNT_TRAITS, this.accountTraits));
  }
  _persistSession() {
    this.storage.setItem(W.SESSION_ID, this.sessionId), this.storage.setItem(W.SESSION_START, this.sessionStartTime), this.storage.setItem(W.SESSION_LAST_ACTIVITY, this.sessionLastActivity);
  }
  identify(e, i = null) {
    if (e && e.id) {
      this.visitorId && this.visitorId !== e.id && !this.visitorId.startsWith("anon_") && w("warn", `Visitor ID changed from ${this.visitorId} to ${e.id}`), this.visitorId = e.id;
      const { id: n, ...r } = e;
      this.visitorTraits = ii(this.visitorTraits, r), this._persistVisitor();
    }
    if (i && i.id) {
      this.accountId && this.accountId !== i.id && w("info", `Account changed from ${this.accountId} to ${i.id}`), this.accountId = i.id;
      const { id: n, ...r } = i;
      this.accountTraits = ii(this.accountTraits, r), this._persistAccount();
    }
    w("info", "Identity updated:", {
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
    this.storage.removeItem(W.VISITOR_ID), this.storage.removeItem(W.VISITOR_TRAITS), this.storage.removeItem(W.ACCOUNT_ID), this.storage.removeItem(W.ACCOUNT_TRAITS), this.storage.removeItem(W.SESSION_ID), this.storage.removeItem(W.SESSION_START), this.storage.removeItem(W.SESSION_LAST_ACTIVITY), this.visitorId = "anon_" + rt(), this.visitorTraits = {}, this.accountId = null, this.accountTraits = {}, this._createNewSession(), this._persistVisitor(), w("info", "Identity reset");
  }
}
class Ho {
  constructor(e) {
    this.identityManager = e, this.deviceInfo = this._captureDeviceInfo();
  }
  _captureDeviceInfo() {
    const { browserName: e, browserVersion: i } = Ao(), { osName: n, osVersion: r } = Lo();
    return {
      device_type: Po(),
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
      timezone: Fo()
    };
  }
  buildEvent(e) {
    const i = st(), n = this.identityManager.getIdentityContext(), r = {
      event_id: "evt_" + rt(),
      visitor_id: n.visitor_id,
      account_id: n.account_id,
      session_id: n.session_id,
      event_name: e.event_name,
      event_type: e.event_type,
      timestamp: i,
      event_date: Oo(),
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
      sdk_version: mi,
      sdk_name: Gn,
      sdk_source: Eo,
      data_version: Co,
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
class $o {
  constructor(e, i) {
    this.storage = e, this.config = i, this.consentGranted = !i.requireConsent;
  }
  processEvent(e) {
    return this.isOptedOut() || this.config.requireConsent && !this.consentGranted || this.isInDoNotProcessList(e.visitor_id) || e._originalElement && this.isSensitiveElement(e._originalElement) ? null : (e = this.maskPII(e), e = this.removeBlacklistedFields(e), delete e._originalElement, e);
  }
  isOptedOut() {
    return this.storage.getItem(W.OPT_OUT) === !0;
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
        w("warn", "Invalid sensitive selector:", n);
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
    i = i.replace(et.email, "[EMAIL_REDACTED]"), i = i.replace(et.phone, "[PHONE_REDACTED]"), i = i.replace(et.ssn, "[SSN_REDACTED]"), i = i.replace(et.creditCard, "[CC_REDACTED]"), i = i.replace(et.ipAddress, "[IP_REDACTED]");
    const n = this.config.privacyConfig?.customPIIPatterns || [];
    for (const r of n)
      try {
        i = i.replace(r, "[REDACTED]");
      } catch {
        w("warn", "Invalid custom PII pattern:", r);
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
    this.consentGranted = !0, w("info", "User consent granted");
  }
  revokeConsent() {
    this.consentGranted = !1, w("info", "User consent revoked");
  }
  optOut() {
    this.storage.setItem(W.OPT_OUT, !0), w("info", "User opted out");
  }
  optIn() {
    this.storage.removeItem(W.OPT_OUT), w("info", "User opted in");
  }
  validateEventSize(e) {
    const i = JSON.stringify(e).length, n = 10 * 1024;
    return i > n ? (w("warn", "Event exceeds max size, truncating:", i), this.truncateEvent(e)) : e;
  }
  truncateEvent(e) {
    return e.element_text && (e.element_text = ti(e.element_text, 100)), e.error_stack && (e.error_stack = ti(e.error_stack, 500)), e.console_logs && (e.console_logs = e.console_logs.slice(0, 5)), e.custom_properties && JSON.stringify(e.custom_properties).length > 5e3 && (e.custom_properties = { _truncated: !0 }), e;
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
class Vo {
  constructor() {
    this.clickHistory = [], this.deadClickTimers = /* @__PURE__ */ new Map(), this.recentErrors = [], this.navigationHistory = [], this._setupErrorListener(), this._setupNavigationListener();
  }
  detectClickInteraction(e, i) {
    const n = this._getElementKey(e), r = Date.now();
    return this._detectRageClick(n, r) ? nt.RAGE_CLICK : this._detectErrorClick(n, r) ? nt.ERROR_CLICK : (this._scheduleDeadClickCheck(e, n, r), nt.NORMAL);
  }
  detectUTurn() {
    const e = Date.now(), i = this.navigationHistory;
    if (i.length < 2) return !1;
    const n = i[i.length - 1], r = i[i.length - 2];
    return n.url === r.url && e - r.time < Ze.uturnThreshold;
  }
  _detectRageClick(e, i) {
    return this.clickHistory.push({ elementKey: e, time: i }), this.clickHistory = this.clickHistory.filter(
      (r) => i - r.time < Ze.rageClickWindow
    ), this.clickHistory.filter(
      (r) => r.elementKey === e
    ).length >= Ze.rageClickThreshold;
  }
  _detectErrorClick(e, i) {
    return this.recentErrors = this.recentErrors.filter(
      (n) => i - n.time < Ze.errorClickWindow
    ), this.recentErrors.length > 0;
  }
  _scheduleDeadClickCheck(e, i, n) {
    this.deadClickTimers.has(i) && clearTimeout(this.deadClickTimers.get(i));
    const r = setTimeout(() => {
      this._isDeadClick(e, n) && w("debug", "Dead click detected:", i), this.deadClickTimers.delete(i);
    }, Ze.deadClickDelay);
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
class Ko {
  constructor(e, i, n) {
    this.eventBuilder = e, this.privacyEngine = i, this.config = n, this.listeners = [], this.lastPageViewTime = 0, this.lastPageViewUrl = null, this.scrollMilestones = {
      25: !1,
      50: !1,
      75: !1,
      100: !1
    }, this.rateLimiters = {}, this.onEventCapture = null, this.isRunning = !1, this.behavioralDetector = new Vo();
  }
  start(e) {
    if (this.isRunning) {
      w("warn", "Auto-capture already running");
      return;
    }
    this.onEventCapture = e, this.isRunning = !0, this.config.autoPageViews && this._startPageViewTracking(), this.config.autoCapture && (this._startClickTracking(), this._startInputTracking(), this._startScrollTracking(), this._startErrorTracking()), w("info", "Auto-capture started");
  }
  stop() {
    this.isRunning && (this.listeners.forEach(({ target: e, event: i, handler: n, options: r }) => {
      e.removeEventListener(i, n, r);
    }), this.listeners = [], this.behavioralDetector && this.behavioralDetector.destroy(), this.isRunning = !1, w("info", "Auto-capture stopped"));
  }
  _addListener(e, i, n, r = !1) {
    e.addEventListener(i, n, r), this.listeners.push({ target: e, event: i, handler: n, options: r });
  }
  _checkRateLimit(e) {
    const i = Ro[e];
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
    const e = history.pushState, i = history.replaceState, n = an(() => this._capturePageView(), Wt.pageView);
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
    if (e - this.lastPageViewTime < Wt.pageView || i === this.lastPageViewUrl)
      return;
    this.lastPageViewTime = e, this.lastPageViewUrl = i, this.scrollMilestones = { 25: !1, 50: !1, 75: !1, 100: !1 };
    const n = this.behavioralDetector.detectUTurn();
    this._emit({
      event_name: Ne.PAGE_VIEW,
      event_type: Be.NAVIGATION,
      interaction_type: n ? nt.U_TURN : nt.NORMAL
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
    if (!Uo(i))
      return;
    const n = this.behavioralDetector.detectClickInteraction(i, e), r = {
      event_name: Ne.CLICK,
      event_type: Be.ENGAGEMENT,
      element_id: i.id || null,
      element_class: i.classList ? Array.from(i.classList) : [],
      element_tag: i.tagName?.toLowerCase() || null,
      element_text: Bo(i),
      element_href: i.href || i.closest("a")?.href || null,
      element_xpath: Mo(i),
      element_selector: No(i),
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
      event_name: Ne.INPUT,
      event_type: Be.ENGAGEMENT,
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
    const e = an(() => this._handleScroll(), Wt.scroll);
    this._addListener(window, "scroll", e);
  }
  _handleScroll() {
    if (!this._checkRateLimit("scroll"))
      return;
    const e = document.documentElement.scrollHeight, i = window.pageYOffset || document.documentElement.scrollTop, n = window.innerHeight, r = e - n, o = r > 0 ? Math.round(i / r * 100) : 100;
    let l = !1;
    const a = { 25: !1, 50: !1, 75: !1, 100: !1 };
    o >= 25 && !this.scrollMilestones[25] && (a[25] = !0, this.scrollMilestones[25] = !0, l = !0), o >= 50 && !this.scrollMilestones[50] && (a[50] = !0, this.scrollMilestones[50] = !0, l = !0), o >= 75 && !this.scrollMilestones[75] && (a[75] = !0, this.scrollMilestones[75] = !0, l = !0), o >= 100 && !this.scrollMilestones[100] && (a[100] = !0, this.scrollMilestones[100] = !0, l = !0), l && this._emit({
      event_name: Ne.SCROLL,
      event_type: Be.ENGAGEMENT,
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
      event_name: Ne.ERROR,
      event_type: Be.DIAGNOSTIC,
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
      event_name: Ne.ERROR,
      event_type: Be.DIAGNOSTIC,
      error_message: i?.message || String(i),
      error_type: i?.name || "UnhandledRejection",
      error_stack: i?.stack || null
    });
  }
  capturePage(e, i = {}) {
    this._emit({
      event_name: Ne.PAGE_VIEW,
      event_type: Be.NAVIGATION,
      custom_properties: { page_name: e, ...i }
    });
  }
}
class qo {
  constructor(e) {
    this.storage = e, this.queue = [], this.maxSize = ko, this.maxPersistedSize = To, this._restore();
  }
  _restore() {
    try {
      const e = this.storage.getItem(W.EVENT_QUEUE);
      e && Array.isArray(e) && (this.queue = e, w("info", `Restored ${this.queue.length} events from storage`));
    } catch (e) {
      w("error", "Failed to restore events from storage:", e);
    }
  }
  _persist() {
    try {
      const e = this.queue.slice(-this.maxPersistedSize);
      this.storage.setItem(W.EVENT_QUEUE, e);
    } catch (e) {
      w("error", "Failed to persist events to storage:", e);
    }
  }
  enqueue(e) {
    if (this.queue.length >= this.maxSize) {
      const i = this.queue.shift();
      w("warn", "Event queue full, dropping oldest event:", i.event_id);
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
    return this.queue = [], this.storage.removeItem(W.EVENT_QUEUE), e;
  }
  size() {
    return this.queue.length;
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  clear() {
    this.queue = [], this.storage.removeItem(W.EVENT_QUEUE), w("info", "Event queue cleared");
  }
  getStats() {
    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      percentFull: Math.round(this.queue.length / this.maxSize * 100)
    };
  }
}
class Qo {
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
    }, e), this._setupUnloadHandler(), w("info", "Transport layer started");
  }
  stop() {
    this.batchTimer && (clearInterval(this.batchTimer), this.batchTimer = null), w("info", "Transport layer stopped");
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
      batch_id: "batch_" + rt(),
      events: i,
      event_count: i.length,
      batch_timestamp: st()
    };
  }
  async _sendBatch(e = null, i = 0) {
    if (e || (e = this._createBatch()), !(!e || e.events.length === 0)) {
      this.isSending = !0;
      try {
        const n = await this._makeRequest(e);
        n.ok ? (this.eventQueue.dequeue(e.events.length), this.stats.sent += e.events.length, w("info", `Batch sent successfully: ${e.events.length} events`)) : await this._handleErrorResponse(n, e, i);
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
      "X-RG-SDK-Version": mi,
      "X-RG-SDK-Name": Gn
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
      r === 401 ? w("error", "Invalid API key. Please check your configuration.") : w("error", `Client error (${r}), dropping batch`), this.eventQueue.dequeue(i.events.length), this.stats.failed += i.events.length;
      return;
    }
    (r === 429 || r >= 500) && this._scheduleRetry(i, n);
  }
  _handleNetworkError(e, i, n) {
    w("error", "Network error:", e.message), this._scheduleRetry(i, n);
  }
  _scheduleRetry(e, i) {
    if (i >= on) {
      w("error", `Max retries exceeded for batch ${e.batch_id}, dropping events`), this.eventQueue.dequeue(e.events.length), this.stats.failed += e.events.length;
      return;
    }
    const n = Ut[i] || Ut[Ut.length - 1], r = Date.now() + n;
    this.retryQueue.set(e.batch_id, {
      batch: e,
      retryCount: i + 1,
      nextRetry: r
    }), this.stats.retried++, w(
      "info",
      `Scheduling retry ${i + 1}/${on} for batch ${e.batch_id} in ${n}ms`
    ), setTimeout(() => {
      const o = this.retryQueue.get(e.batch_id);
      o && (this.retryQueue.delete(e.batch_id), this._sendBatch(o.batch, o.retryCount));
    }, n);
  }
  async flush() {
    if (!this.eventQueue.isEmpty()) {
      for (w("info", "Flushing event queue..."), this._isFlushRequested = !0; !this.eventQueue.isEmpty() && !this.isSending; )
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
        navigator.sendBeacon(i, n) ? (this.eventQueue.dequeue(e.events.length), w("info", `Sent ${e.events.length} events via sendBeacon`)) : w("warn", "sendBeacon failed, events may be lost");
      } else
        w("warn", "sendBeacon not available, events may be lost");
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
class jo {
  constructor() {
    this.initialized = !1, this.config = null, this.storage = null, this.identityManager = null, this.eventBuilder = null, this.privacyEngine = null, this.autoCaptureEngine = null, this.eventQueue = null, this.transportLayer = null, this.pendingIdentify = null;
  }
  initialize(e) {
    if (this.initialized) {
      w("warn", "SDK already initialized");
      return;
    }
    if (!e || !e.apiKey)
      throw new Error("API key is required");
    this.config = ii(Io, e), w("info", "Initializing RG SDK...", {
      version: mi,
      config: this.config
    }), this._initializeModules(), this.initialized = !0, this.pendingIdentify && (this.identify(this.pendingIdentify.visitor, this.pendingIdentify.account), this.pendingIdentify = null), w("info", "RG SDK initialized successfully");
  }
  _initializeModules() {
    this.storage = new Wo(this.config.persistence), this.identityManager = new Go(this.storage, this.config), this.identityManager.initialize(), this.eventBuilder = new Ho(this.identityManager), this.privacyEngine = new $o(this.storage, this.config), this.eventQueue = new qo(this.storage), this.transportLayer = new Qo(this.config, this.eventQueue), this.transportLayer.start(), this.autoCaptureEngine = new Ko(
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
      this.pendingIdentify = { visitor: e, account: i }, w("info", "Identity queued, will be applied after initialization");
      return;
    }
    this.identityManager.identify(e, i);
  }
  track(e, i = {}) {
    if (!this.initialized) {
      w("warn", "SDK not initialized, cannot track event");
      return;
    }
    if (!e || typeof e != "string") {
      w("warn", "Event name is required and must be a string");
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
      w("warn", "SDK not initialized, cannot track page view");
      return;
    }
    const n = { ...i };
    e && (n.page_name = e);
    const r = this.eventBuilder.buildPageViewEvent(n), o = this.privacyEngine.processEvent(r);
    if (o) {
      const l = this.privacyEngine.validateEventSize(o);
      this.eventQueue.enqueue(l), this.transportLayer.checkBatchSize();
    }
  }
  async flush() {
    if (!this.initialized) {
      w("warn", "SDK not initialized");
      return;
    }
    await this.transportLayer.flush();
  }
  optOut() {
    if (!this.initialized) {
      w("warn", "SDK not initialized");
      return;
    }
    this.autoCaptureEngine && this.autoCaptureEngine.stop(), this.eventQueue.clear(), this.privacyEngine.optOut(), w("info", "User opted out of tracking");
  }
  optIn() {
    if (!this.initialized) {
      w("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.optIn(), (this.config.autoCapture || this.config.autoPageViews) && this.autoCaptureEngine.start((e) => this._handleCapturedEvent(e)), w("info", "User opted in to tracking");
  }
  grantConsent() {
    if (!this.initialized) {
      w("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.grantConsent();
  }
  revokeConsent() {
    if (!this.initialized) {
      w("warn", "SDK not initialized");
      return;
    }
    this.privacyEngine.revokeConsent(), this.eventQueue.clear();
  }
  reset() {
    if (!this.initialized) {
      w("warn", "SDK not initialized");
      return;
    }
    this.identityManager.reset(), w("info", "Identity reset");
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
    this.config.debug = e, w("info", `Debug mode ${e ? "enabled" : "disabled"}`);
  }
}
const re = new jo(), ue = {
  initialize: (t) => {
    re.initialize(t);
  },
  identify: (t, e) => {
    re.identify(t, e);
  },
  track: (t, e) => {
    re.track(t, e);
  },
  page: (t, e) => {
    re.page(t, e);
  },
  flush: () => re.flush(),
  optOut: () => {
    re.optOut();
  },
  optIn: () => {
    re.optIn();
  },
  grantConsent: () => {
    re.grantConsent();
  },
  revokeConsent: () => {
    re.revokeConsent();
  },
  reset: () => {
    re.reset();
  },
  getVisitorId: () => re.getVisitorId(),
  getAccountId: () => re.getAccountId(),
  getSessionId: () => re.getSessionId(),
  getStats: () => re.getStats(),
  debug: (t) => {
    re.debug(t);
  },
  version: "1.0.0"
};
typeof window < "u" && (window.rg = ue);
let ie = null, Hn = !1;
const $n = "designerGuideId", Vn = "designerTemplateId";
let Kn = null, qn = null;
function Yo() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem($n) : null;
  } catch {
    return null;
  }
}
function Xo() {
  try {
    return typeof localStorage < "u" ? localStorage.getItem(Vn) : null;
  } catch {
    return null;
  }
}
function Te(t) {
  return t?.apiKey ? ue.initialize(t) : console.warn("[Revgain] No apiKey found in config. Analytics will not start."), ie || (ie = new Wn({
    ...t,
    guideId: Kn ?? t?.guideId ?? Yo() ?? null,
    templateId: qn ?? t?.templateId ?? Xo() ?? null
  }), ie.init(), ie);
}
function gi(t, e) {
  ue.identify(t, e);
}
function yi(t, e) {
  ue.track(t, e);
}
function Ct() {
  return ie;
}
function Qn(t) {
  if (!t || !Array.isArray(t)) return;
  t.splice(0, t.length).forEach((i) => {
    if (!i || !Array.isArray(i) || i.length === 0) return;
    const n = i[0], r = i.slice(1);
    try {
      switch (n) {
        case "initialize":
        case "init":
          Te(r[0]);
          break;
        case "identify":
          gi(r[0], r[1]);
          break;
        case "track":
          yi(r[0], r[1]);
          break;
        case "enableEditor":
          (ie ?? Te()).enableEditor();
          break;
        case "disableEditor":
          ie?.disableEditor();
          break;
        case "loadGuides":
          ie?.loadGuides();
          break;
        case "getGuides":
          return ie?.getGuides();
        default:
          typeof ue[n] == "function" ? ue[n](...r) : console.warn("[Revgain] Unknown snippet method:", n);
      }
    } catch (o) {
      console.error("[Revgain] Error processing queued call:", n, o);
    }
  });
}
if (typeof window < "u") {
  const t = window.revgain || window.visualDesigner;
  t && Array.isArray(t._q) && (Hn = !0, t.init = Te, t.initialize = Te, t.identify = gi, t.track = yi, t.enableEditor = () => (ie ?? Te()).enableEditor(), t.disableEditor = () => ie?.disableEditor(), t.loadGuides = () => ie?.loadGuides(), t.getGuides = () => ie?.getGuides(), t.getInstance = Ct, t.page = (e, i) => ue.page(e, i), t.flush = () => ue.flush(), t.reset = () => ue.reset(), Qn(t._q));
  try {
    const e = new URL(window.location.href), i = e.searchParams.get("designer"), n = e.searchParams.get("mode"), r = e.searchParams.get("iud"), o = e.searchParams.get("guide_id"), l = e.searchParams.get("template_id");
    (i === "true" || o != null || l != null) && console.log("[Revgain] URL params detected:", { designerParam: i, modeParam: n, guideIdParam: o }), i === "true" && (n && (window.__visualDesignerMode = n, localStorage.setItem("designerModeType", n)), localStorage.setItem("designerMode", "true"), r && localStorage.setItem(Nn, r), o != null && (Kn = o, localStorage.setItem($n, o)), l != null && (qn = l, localStorage.setItem(Vn, l)), e.searchParams.delete("designer"), e.searchParams.delete("mode"), e.searchParams.delete("iud"), e.searchParams.delete("guide_id"), e.searchParams.delete("template_id"), window.history.replaceState({}, "", e.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !ie && !Hn) {
  const t = localStorage.getItem("designerMode") === "true", e = () => {
    !ie && t && Te();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
if (typeof window < "u") {
  const t = {
    init: Te,
    initialize: Te,
    identify: gi,
    track: yi,
    page: (e, i) => ue.page(e, i),
    flush: () => ue.flush(),
    reset: () => ue.reset(),
    getInstance: Ct,
    DesignerSDK: Wn,
    apiClient: ae,
    _processQueue: Qn,
    getGuideId: () => Ct()?.getGuideId() ?? null,
    getTemplateId: () => Ct()?.getTemplateId() ?? null,
    enableEditor: () => (ie ?? Te()).enableEditor(),
    disableEditor: () => ie?.disableEditor(),
    analytics: ue
  };
  window.revgain = t, window.VisualDesigner = t;
}
export {
  Wn as DesignerSDK,
  Qn as _processQueue,
  ae as apiClient,
  Ct as getInstance,
  gi as identify,
  Te as init,
  ue as rg,
  yi as track
};
