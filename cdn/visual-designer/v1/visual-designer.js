class X {
  static generateSelector(e) {
    if (e.id)
      return {
        selector: `#${this.escapeSelector(e.id)}`,
        confidence: "high",
        method: "id"
      };
    if (e.hasAttribute("data-testid")) {
      const r = e.getAttribute("data-testid");
      return {
        selector: `[data-testid="${this.escapeAttribute(r)}"]`,
        confidence: "high",
        method: "data-testid"
      };
    }
    const n = this.getSemanticDataAttributes(e);
    if (n.length > 0) {
      const r = n[0], s = e.getAttribute(r);
      return {
        selector: `[${r}="${this.escapeAttribute(s)}"]`,
        confidence: "high",
        method: "data-attribute"
      };
    }
    const i = this.generateAriaSelector(e);
    if (i)
      return { selector: i, confidence: "medium", method: "aria" };
    const o = this.generatePathSelector(e);
    return o ? { selector: o, confidence: "medium", method: "path" } : {
      selector: e.tagName.toLowerCase(),
      confidence: "low",
      method: "tag"
    };
  }
  static findElement(e) {
    try {
      return document.querySelector(e);
    } catch {
      return null;
    }
  }
  static validateSelector(e) {
    try {
      return document.querySelector(e) !== null;
    } catch {
      return !1;
    }
  }
  static getSemanticDataAttributes(e) {
    const n = ["data-id", "data-name", "data-role", "data-component", "data-element"], i = [];
    for (const o of n)
      e.hasAttribute(o) && i.push(o);
    for (let o = 0; o < e.attributes.length; o++) {
      const r = e.attributes[o];
      r.name.startsWith("data-") && !i.includes(r.name) && i.push(r.name);
    }
    return i;
  }
  static generateAriaSelector(e) {
    const n = e.getAttribute("role"), i = e.getAttribute("aria-label");
    if (n) {
      let o = `[role="${this.escapeAttribute(n)}"]`;
      return i && (o += `[aria-label="${this.escapeAttribute(i)}"]`), o;
    }
    return null;
  }
  static generatePathSelector(e) {
    const n = [];
    let i = e;
    for (; i && i !== document.body && i !== document.documentElement; ) {
      let o = i.tagName.toLowerCase();
      if (i.id) {
        o += `#${this.escapeSelector(i.id)}`, n.unshift(o);
        break;
      }
      if (i.className && typeof i.className == "string") {
        const s = i.className.split(/\s+/).filter((l) => l && !l.startsWith("designer-")).slice(0, 2);
        s.length > 0 && (o += "." + s.map((l) => this.escapeSelector(l)).join("."));
      }
      const r = i.parentElement;
      if (r) {
        const s = Array.from(r.children).filter(
          (l) => l.tagName === i.tagName
        );
        s.length > 1 && (o += `:nth-of-type(${s.indexOf(i) + 1})`);
      }
      if (n.unshift(o), i = r, n.length >= 5) break;
    }
    return n.length > 0 ? n.join(" > ") : null;
  }
  static escapeSelector(e) {
    return typeof CSS < "u" && CSS.escape ? CSS.escape(e) : e.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }
  static escapeAttribute(e) {
    return e.replace(/"/g, '\\"').replace(/'/g, "\\'");
  }
}
function Ce(t) {
  const e = t.getBoundingClientRect(), n = {};
  for (let i = 0; i < t.attributes.length; i++) {
    const o = t.attributes[i];
    n[o.name] = o.value;
  }
  return {
    tagName: t.tagName.toLowerCase(),
    id: t.id || void 0,
    className: t.className?.toString() || void 0,
    textContent: t.textContent?.trim().substring(0, 50) || void 0,
    attributes: n,
    boundingRect: e
  };
}
function te(t) {
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0" && t.getBoundingClientRect().height > 0 && t.getBoundingClientRect().width > 0;
}
function K() {
  return window.location.pathname || "/";
}
function ne() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Ie(t) {
  const e = t.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function Te(t) {
  Ie(t) || t.scrollIntoView({ behavior: "smooth", block: "center" });
}
const ie = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class Le {
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
    const n = e.target;
    if (!(!n || n === this.highlightOverlay)) {
      if (n.closest(ie)) {
        this.hideHighlight();
        return;
      }
      if (!te(n)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(n);
    }
  };
  handleClick = (e) => {
    if (!this.isActive) return;
    const n = e.target;
    n && (n.closest(ie) || (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), te(n) && this.selectElement(n)));
  };
  handleKeyDown = (e) => {
    this.isActive && e.key === "Escape" && (this.messageCallback?.({ type: "CANCEL" }), this.hideHighlight());
  };
  highlightElement(e) {
    if (!this.highlightOverlay) return;
    const n = e.getBoundingClientRect(), i = window.pageXOffset || document.documentElement.scrollLeft, o = window.pageYOffset || document.documentElement.scrollTop;
    this.highlightOverlay.style.display = "block", this.highlightOverlay.style.left = `${n.left + i}px`, this.highlightOverlay.style.top = `${n.top + o}px`, this.highlightOverlay.style.width = `${n.width}px`, this.highlightOverlay.style.height = `${n.height}px`;
  }
  hideHighlight() {
    this.highlightOverlay && (this.highlightOverlay.style.display = "none");
  }
  selectElement(e) {
    this.highlightElement(e);
    const n = X.generateSelector(e), i = Ce(e);
    this.messageCallback?.({
      type: "ELEMENT_SELECTED",
      selector: n.selector,
      elementInfo: i
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
var H, h, ge, T, re, ue, pe, fe, q, Y, j, D = {}, he = [], Me = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, V = Array.isArray;
function k(t, e) {
  for (var n in e) t[n] = e[n];
  return t;
}
function J(t) {
  t && t.parentNode && t.parentNode.removeChild(t);
}
function Be(t, e, n) {
  var i, o, r, s = {};
  for (r in e) r == "key" ? i = e[r] : r == "ref" ? o = e[r] : s[r] = e[r];
  if (arguments.length > 2 && (s.children = arguments.length > 3 ? H.call(arguments, 2) : n), typeof t == "function" && t.defaultProps != null) for (r in t.defaultProps) s[r] === void 0 && (s[r] = t.defaultProps[r]);
  return U(t, s, i, o, null);
}
function U(t, e, n, i, o) {
  var r = { type: t, props: e, key: n, ref: i, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: o ?? ++ge, __i: -1, __u: 0 };
  return o == null && h.vnode != null && h.vnode(r), r;
}
function z(t) {
  return t.children;
}
function N(t, e) {
  this.props = t, this.context = e;
}
function M(t, e) {
  if (e == null) return t.__ ? M(t.__, t.__i + 1) : null;
  for (var n; e < t.__k.length; e++) if ((n = t.__k[e]) != null && n.__e != null) return n.__e;
  return typeof t.type == "function" ? M(t) : null;
}
function me(t) {
  var e, n;
  if ((t = t.__) != null && t.__c != null) {
    for (t.__e = t.__c.base = null, e = 0; e < t.__k.length; e++) if ((n = t.__k[e]) != null && n.__e != null) {
      t.__e = t.__c.base = n.__e;
      break;
    }
    return me(t);
  }
}
function oe(t) {
  (!t.__d && (t.__d = !0) && T.push(t) && !G.__r++ || re != h.debounceRendering) && ((re = h.debounceRendering) || ue)(G);
}
function G() {
  for (var t, e, n, i, o, r, s, l = 1; T.length; ) T.length > l && T.sort(pe), t = T.shift(), l = T.length, t.__d && (n = void 0, i = void 0, o = (i = (e = t).__v).__e, r = [], s = [], e.__P && ((n = k({}, i)).__v = i.__v + 1, h.vnode && h.vnode(n), Q(e.__P, n, i, e.__n, e.__P.namespaceURI, 32 & i.__u ? [o] : null, r, o ?? M(i), !!(32 & i.__u), s), n.__v = i.__v, n.__.__k[n.__i] = n, ye(r, n, s), i.__e = i.__ = null, n.__e != o && me(n)));
  G.__r = 0;
}
function be(t, e, n, i, o, r, s, l, g, d, c) {
  var a, b, u, y, w, x, m, f = i && i.__k || he, S = e.length;
  for (g = Ae(n, e, f, g, S), a = 0; a < S; a++) (u = n.__k[a]) != null && (b = u.__i == -1 ? D : f[u.__i] || D, u.__i = a, x = Q(t, u, b, o, r, s, l, g, d, c), y = u.__e, u.ref && b.ref != u.ref && (b.ref && Z(b.ref, null, u), c.push(u.ref, u.__c || y, u)), w == null && y != null && (w = y), (m = !!(4 & u.__u)) || b.__k === u.__k ? g = ve(u, g, t, m) : typeof u.type == "function" && x !== void 0 ? g = x : y && (g = y.nextSibling), u.__u &= -7);
  return n.__e = w, g;
}
function Ae(t, e, n, i, o) {
  var r, s, l, g, d, c = n.length, a = c, b = 0;
  for (t.__k = new Array(o), r = 0; r < o; r++) (s = e[r]) != null && typeof s != "boolean" && typeof s != "function" ? (typeof s == "string" || typeof s == "number" || typeof s == "bigint" || s.constructor == String ? s = t.__k[r] = U(null, s, null, null, null) : V(s) ? s = t.__k[r] = U(z, { children: s }, null, null, null) : s.constructor === void 0 && s.__b > 0 ? s = t.__k[r] = U(s.type, s.props, s.key, s.ref ? s.ref : null, s.__v) : t.__k[r] = s, g = r + b, s.__ = t, s.__b = t.__b + 1, l = null, (d = s.__i = De(s, n, g, a)) != -1 && (a--, (l = n[d]) && (l.__u |= 2)), l == null || l.__v == null ? (d == -1 && (o > c ? b-- : o < c && b++), typeof s.type != "function" && (s.__u |= 4)) : d != g && (d == g - 1 ? b-- : d == g + 1 ? b++ : (d > g ? b-- : b++, s.__u |= 4))) : t.__k[r] = null;
  if (a) for (r = 0; r < c; r++) (l = n[r]) != null && (2 & l.__u) == 0 && (l.__e == i && (i = M(l)), _e(l, l));
  return i;
}
function ve(t, e, n, i) {
  var o, r;
  if (typeof t.type == "function") {
    for (o = t.__k, r = 0; o && r < o.length; r++) o[r] && (o[r].__ = t, e = ve(o[r], e, n, i));
    return e;
  }
  t.__e != e && (i && (e && t.type && !e.parentNode && (e = M(t)), n.insertBefore(t.__e, e || null)), e = t.__e);
  do
    e = e && e.nextSibling;
  while (e != null && e.nodeType == 8);
  return e;
}
function De(t, e, n, i) {
  var o, r, s, l = t.key, g = t.type, d = e[n], c = d != null && (2 & d.__u) == 0;
  if (d === null && l == null || c && l == d.key && g == d.type) return n;
  if (i > (c ? 1 : 0)) {
    for (o = n - 1, r = n + 1; o >= 0 || r < e.length; ) if ((d = e[s = o >= 0 ? o-- : r++]) != null && (2 & d.__u) == 0 && l == d.key && g == d.type) return s;
  }
  return -1;
}
function ae(t, e, n) {
  e[0] == "-" ? t.setProperty(e, n ?? "") : t[e] = n == null ? "" : typeof n != "number" || Me.test(e) ? n : n + "px";
}
function R(t, e, n, i, o) {
  var r, s;
  e: if (e == "style") if (typeof n == "string") t.style.cssText = n;
  else {
    if (typeof i == "string" && (t.style.cssText = i = ""), i) for (e in i) n && e in n || ae(t.style, e, "");
    if (n) for (e in n) i && n[e] == i[e] || ae(t.style, e, n[e]);
  }
  else if (e[0] == "o" && e[1] == "n") r = e != (e = e.replace(fe, "$1")), s = e.toLowerCase(), e = s in t || e == "onFocusOut" || e == "onFocusIn" ? s.slice(2) : e.slice(2), t.l || (t.l = {}), t.l[e + r] = n, n ? i ? n.u = i.u : (n.u = q, t.addEventListener(e, r ? j : Y, r)) : t.removeEventListener(e, r ? j : Y, r);
  else {
    if (o == "http://www.w3.org/2000/svg") e = e.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if (e != "width" && e != "height" && e != "href" && e != "list" && e != "form" && e != "tabIndex" && e != "download" && e != "rowSpan" && e != "colSpan" && e != "role" && e != "popover" && e in t) try {
      t[e] = n ?? "";
      break e;
    } catch {
    }
    typeof n == "function" || (n == null || n === !1 && e[4] != "-" ? t.removeAttribute(e) : t.setAttribute(e, e == "popover" && n == 1 ? "" : n));
  }
}
function se(t) {
  return function(e) {
    if (this.l) {
      var n = this.l[e.type + t];
      if (e.t == null) e.t = q++;
      else if (e.t < n.u) return;
      return n(h.event ? h.event(e) : e);
    }
  };
}
function Q(t, e, n, i, o, r, s, l, g, d) {
  var c, a, b, u, y, w, x, m, f, S, I, F, B, ee, O, A, $, E = e.type;
  if (e.constructor !== void 0) return null;
  128 & n.__u && (g = !!(32 & n.__u), r = [l = e.__e = n.__e]), (c = h.__b) && c(e);
  e: if (typeof E == "function") try {
    if (m = e.props, f = "prototype" in E && E.prototype.render, S = (c = E.contextType) && i[c.__c], I = c ? S ? S.props.value : c.__ : i, n.__c ? x = (a = e.__c = n.__c).__ = a.__E : (f ? e.__c = a = new E(m, I) : (e.__c = a = new N(m, I), a.constructor = E, a.render = ze), S && S.sub(a), a.state || (a.state = {}), a.__n = i, b = a.__d = !0, a.__h = [], a._sb = []), f && a.__s == null && (a.__s = a.state), f && E.getDerivedStateFromProps != null && (a.__s == a.state && (a.__s = k({}, a.__s)), k(a.__s, E.getDerivedStateFromProps(m, a.__s))), u = a.props, y = a.state, a.__v = e, b) f && E.getDerivedStateFromProps == null && a.componentWillMount != null && a.componentWillMount(), f && a.componentDidMount != null && a.__h.push(a.componentDidMount);
    else {
      if (f && E.getDerivedStateFromProps == null && m !== u && a.componentWillReceiveProps != null && a.componentWillReceiveProps(m, I), e.__v == n.__v || !a.__e && a.shouldComponentUpdate != null && a.shouldComponentUpdate(m, a.__s, I) === !1) {
        for (e.__v != n.__v && (a.props = m, a.state = a.__s, a.__d = !1), e.__e = n.__e, e.__k = n.__k, e.__k.some(function(L) {
          L && (L.__ = e);
        }), F = 0; F < a._sb.length; F++) a.__h.push(a._sb[F]);
        a._sb = [], a.__h.length && s.push(a);
        break e;
      }
      a.componentWillUpdate != null && a.componentWillUpdate(m, a.__s, I), f && a.componentDidUpdate != null && a.__h.push(function() {
        a.componentDidUpdate(u, y, w);
      });
    }
    if (a.context = I, a.props = m, a.__P = t, a.__e = !1, B = h.__r, ee = 0, f) {
      for (a.state = a.__s, a.__d = !1, B && B(e), c = a.render(a.props, a.state, a.context), O = 0; O < a._sb.length; O++) a.__h.push(a._sb[O]);
      a._sb = [];
    } else do
      a.__d = !1, B && B(e), c = a.render(a.props, a.state, a.context), a.state = a.__s;
    while (a.__d && ++ee < 25);
    a.state = a.__s, a.getChildContext != null && (i = k(k({}, i), a.getChildContext())), f && !b && a.getSnapshotBeforeUpdate != null && (w = a.getSnapshotBeforeUpdate(u, y)), A = c, c != null && c.type === z && c.key == null && (A = xe(c.props.children)), l = be(t, V(A) ? A : [A], e, n, i, o, r, s, l, g, d), a.base = e.__e, e.__u &= -161, a.__h.length && s.push(a), x && (a.__E = a.__ = null);
  } catch (L) {
    if (e.__v = null, g || r != null) if (L.then) {
      for (e.__u |= g ? 160 : 128; l && l.nodeType == 8 && l.nextSibling; ) l = l.nextSibling;
      r[r.indexOf(l)] = null, e.__e = l;
    } else {
      for ($ = r.length; $--; ) J(r[$]);
      W(e);
    }
    else e.__e = n.__e, e.__k = n.__k, L.then || W(e);
    h.__e(L, e, n);
  }
  else r == null && e.__v == n.__v ? (e.__k = n.__k, e.__e = n.__e) : l = e.__e = Pe(n.__e, e, n, i, o, r, s, g, d);
  return (c = h.diffed) && c(e), 128 & e.__u ? void 0 : l;
}
function W(t) {
  t && t.__c && (t.__c.__e = !0), t && t.__k && t.__k.forEach(W);
}
function ye(t, e, n) {
  for (var i = 0; i < n.length; i++) Z(n[i], n[++i], n[++i]);
  h.__c && h.__c(e, t), t.some(function(o) {
    try {
      t = o.__h, o.__h = [], t.some(function(r) {
        r.call(o);
      });
    } catch (r) {
      h.__e(r, o.__v);
    }
  });
}
function xe(t) {
  return typeof t != "object" || t == null || t.__b && t.__b > 0 ? t : V(t) ? t.map(xe) : k({}, t);
}
function Pe(t, e, n, i, o, r, s, l, g) {
  var d, c, a, b, u, y, w, x = n.props || D, m = e.props, f = e.type;
  if (f == "svg" ? o = "http://www.w3.org/2000/svg" : f == "math" ? o = "http://www.w3.org/1998/Math/MathML" : o || (o = "http://www.w3.org/1999/xhtml"), r != null) {
    for (d = 0; d < r.length; d++) if ((u = r[d]) && "setAttribute" in u == !!f && (f ? u.localName == f : u.nodeType == 3)) {
      t = u, r[d] = null;
      break;
    }
  }
  if (t == null) {
    if (f == null) return document.createTextNode(m);
    t = document.createElementNS(o, f, m.is && m), l && (h.__m && h.__m(e, r), l = !1), r = null;
  }
  if (f == null) x === m || l && t.data == m || (t.data = m);
  else {
    if (r = r && H.call(t.childNodes), !l && r != null) for (x = {}, d = 0; d < t.attributes.length; d++) x[(u = t.attributes[d]).name] = u.value;
    for (d in x) if (u = x[d], d != "children") {
      if (d == "dangerouslySetInnerHTML") a = u;
      else if (!(d in m)) {
        if (d == "value" && "defaultValue" in m || d == "checked" && "defaultChecked" in m) continue;
        R(t, d, null, u, o);
      }
    }
    for (d in m) u = m[d], d == "children" ? b = u : d == "dangerouslySetInnerHTML" ? c = u : d == "value" ? y = u : d == "checked" ? w = u : l && typeof u != "function" || x[d] === u || R(t, d, u, x[d], o);
    if (c) l || a && (c.__html == a.__html || c.__html == t.innerHTML) || (t.innerHTML = c.__html), e.__k = [];
    else if (a && (t.innerHTML = ""), be(e.type == "template" ? t.content : t, V(b) ? b : [b], e, n, i, f == "foreignObject" ? "http://www.w3.org/1999/xhtml" : o, r, s, r ? r[0] : n.__k && M(n, 0), l, g), r != null) for (d = r.length; d--; ) J(r[d]);
    l || (d = "value", f == "progress" && y == null ? t.removeAttribute("value") : y != null && (y !== t[d] || f == "progress" && !y || f == "option" && y != x[d]) && R(t, d, y, x[d], o), d = "checked", w != null && w != t[d] && R(t, d, w, x[d], o));
  }
  return t;
}
function Z(t, e, n) {
  try {
    if (typeof t == "function") {
      var i = typeof t.__u == "function";
      i && t.__u(), i && e == null || (t.__u = t(e));
    } else t.current = e;
  } catch (o) {
    h.__e(o, n);
  }
}
function _e(t, e, n) {
  var i, o;
  if (h.unmount && h.unmount(t), (i = t.ref) && (i.current && i.current != t.__e || Z(i, null, e)), (i = t.__c) != null) {
    if (i.componentWillUnmount) try {
      i.componentWillUnmount();
    } catch (r) {
      h.__e(r, e);
    }
    i.base = i.__P = null;
  }
  if (i = t.__k) for (o = 0; o < i.length; o++) i[o] && _e(i[o], e, n || typeof t.type != "function");
  n || J(t.__e), t.__c = t.__ = t.__e = void 0;
}
function ze(t, e, n) {
  return this.constructor(t, n);
}
function P(t, e, n) {
  var i, o, r, s;
  e == document && (e = document.documentElement), h.__ && h.__(t, e), o = (i = !1) ? null : e.__k, r = [], s = [], Q(e, t = e.__k = Be(z, null, [t]), o || D, D, e.namespaceURI, o ? null : e.firstChild ? H.call(e.childNodes) : null, r, o ? o.__e : e.firstChild, i, s), ye(r, t, s);
}
H = he.slice, h = { __e: function(t, e, n, i) {
  for (var o, r, s; e = e.__; ) if ((o = e.__c) && !o.__) try {
    if ((r = o.constructor) && r.getDerivedStateFromError != null && (o.setState(r.getDerivedStateFromError(t)), s = o.__d), o.componentDidCatch != null && (o.componentDidCatch(t, i || {}), s = o.__d), s) return o.__E = o;
  } catch (l) {
    t = l;
  }
  throw t;
} }, ge = 0, N.prototype.setState = function(t, e) {
  var n;
  n = this.__s != null && this.__s != this.state ? this.__s : this.__s = k({}, this.state), typeof t == "function" && (t = t(k({}, n), this.props)), t && k(n, t), t != null && this.__v && (e && this._sb.push(e), oe(this));
}, N.prototype.forceUpdate = function(t) {
  this.__v && (this.__e = !0, t && this.__h.push(t), oe(this));
}, N.prototype.render = z, T = [], ue = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, pe = function(t, e) {
  return t.__v.__b - e.__v.__b;
}, G.__r = 0, fe = /(PointerCapture)$|Capture$/i, q = 0, Y = se(!1), j = se(!0);
var Fe = 0;
function v(t, e, n, i, o, r) {
  e || (e = {});
  var s, l, g = e;
  if ("ref" in g) for (l in g = {}, e) l == "ref" ? s = e[l] : g[l] = e[l];
  var d = { type: t, props: g, key: n, ref: s, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --Fe, __i: -1, __u: 0, __source: o, __self: r };
  if (typeof t == "function" && (s = t.defaultProps)) for (l in s) g[l] === void 0 && (g[l] = s[l]);
  return h.vnode && h.vnode(d), d;
}
const p = {
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
function Oe({ guide: t, top: e, left: n, arrowStyle: i, onDismiss: o }) {
  return /* @__PURE__ */ v(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": t.id,
      style: {
        position: "absolute",
        background: p.bg,
        border: `2px solid ${p.primary}`,
        borderRadius: p.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: p.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: p.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: p.text,
        top: `${e}px`,
        left: `${n}px`,
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ v("div", { style: { marginBottom: 8 }, children: t.content }),
        /* @__PURE__ */ v(
          "button",
          {
            type: "button",
            onClick: o,
            style: {
              background: p.primary,
              color: p.bg,
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
        /* @__PURE__ */ v(
          "div",
          {
            className: "designer-guide-arrow",
            style: {
              position: "absolute",
              width: 0,
              height: 0,
              borderStyle: "solid",
              ...i
            }
          }
        )
      ]
    }
  );
}
function Re(t) {
  const e = { position: "absolute" };
  switch (t) {
    case "top":
      return { ...e, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${p.primary} transparent transparent transparent` };
    case "bottom":
      return { ...e, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${p.primary} transparent` };
    case "left":
      return { ...e, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${p.primary}` };
    default:
      return { ...e, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${p.primary} transparent transparent` };
  }
}
function Ue(t, e, n, i) {
  const o = t.getBoundingClientRect(), r = window.pageXOffset || document.documentElement.scrollLeft, s = window.pageYOffset || document.documentElement.scrollTop, l = window.innerWidth, g = window.innerHeight;
  let d = 0, c = 0;
  switch (e) {
    case "top":
      d = o.top + s - i - 12, c = o.left + r + o.width / 2 - n / 2;
      break;
    case "bottom":
      d = o.bottom + s + 12, c = o.left + r + o.width / 2 - n / 2;
      break;
    case "left":
      d = o.top + s + o.height / 2 - i / 2, c = o.left + r - n - 12;
      break;
    default:
      d = o.top + s + o.height / 2 - i / 2, c = o.right + r + 12;
      break;
  }
  return c < r ? c = r + 10 : c + n > r + l && (c = r + l - n - 10), d < s ? d = s + 10 : d + i > s + g && (d = s + g - i - 10), { top: d, left: c, arrowStyle: Re(e) };
}
class Ne {
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
    const n = K(), i = e.filter(
      (r) => r.page === n && r.status === "active" && !this.dismissedThisSession.has(r.id)
    );
    if (i.length === 0 || (this.ensureContainer(), !this.container)) return;
    const o = [];
    for (const r of i) {
      const s = X.findElement(r.selector);
      if (!s) continue;
      Te(s);
      const l = Ue(s, r.placement, 280, 80);
      o.push({ guide: r, target: s, pos: l });
    }
    P(
      /* @__PURE__ */ v(
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
            zIndex: p.zIndex.guides
          },
          children: o.map(({ guide: r, pos: s }) => /* @__PURE__ */ v(
            Oe,
            {
              guide: r,
              top: s.top,
              left: s.left,
              arrowStyle: s.arrowStyle,
              onDismiss: () => this.dismissGuide(r.id)
            },
            r.id
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
    this.dismissedThisSession.clear(), this.container && P(null, this.container);
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
const de = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function Ge({ feature: t, color: e, rect: n }) {
  const i = window.pageXOffset || document.documentElement.scrollLeft, o = window.pageYOffset || document.documentElement.scrollTop;
  return /* @__PURE__ */ v(
    "div",
    {
      className: "designer-feature-heatmap-overlay",
      title: t.featureName,
      style: {
        position: "absolute",
        left: n.left + i,
        top: n.top + o,
        width: n.width,
        height: n.height,
        backgroundColor: e,
        pointerEvents: "none",
        zIndex: p.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${e}`
      }
    }
  );
}
function le(t) {
  return (t || "").replace(/^https?:\/\//i, "").replace(/\/$/, "").trim() || "";
}
function He() {
  try {
    return window.location.href || "";
  } catch {
    return "";
  }
}
class Ve {
  container = null;
  lastEnabled = !1;
  render(e, n) {
    if (this.lastEnabled = n, this.clear(), !n || e.length === 0) return;
    const i = He(), o = le(i), r = e.filter((l) => l.url && le(l.url) === o);
    if (r.length === 0 || (this.ensureContainer(), !this.container)) return;
    const s = r.map((l, g) => {
      const d = X.findElement(l.selector);
      if (!d) return null;
      const c = d.getBoundingClientRect(), a = de[g % de.length];
      return { feature: l, rect: c, color: a };
    }).filter(Boolean);
    P(
      /* @__PURE__ */ v(
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
            zIndex: p.zIndex.overlay - 1
          },
          children: s.map(({ feature: l, rect: g, color: d }) => /* @__PURE__ */ v(
            Ge,
            {
              feature: l,
              color: d,
              rect: {
                left: g.left,
                top: g.top,
                width: g.width,
                height: g.height
              }
            },
            l.id
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
    this.container && P(null, this.container);
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
class $e {
  iframe = null;
  dragHandle = null;
  gripButton = null;
  messageCallback = null;
  isReady = !1;
  mode = null;
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
  create(e, n) {
    if (console.log("[Visual Designer] EditorFrame.create() called with mode:", n), this.iframe) {
      console.warn("[Visual Designer] EditorFrame already created, skipping");
      return;
    }
    this.mode = n || null, this.messageCallback = e, console.log("[Visual Designer] Creating editor iframe with mode:", this.mode), this.iframe = document.createElement("iframe"), this.iframe.id = "designer-editor-frame", this.iframe.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 600px;
      height: 800px;
      max-height: 90vh;
      border: none;
      border-radius: 12px;
      background: white;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      display: none;
      overflow: hidden;
    `, this.createDragHandle(), this.loadEditorHtml(), window.addEventListener("message", this.handleMessage);
    const i = () => {
      document.body ? (document.body.appendChild(this.iframe), this.dragHandle && document.body.appendChild(this.dragHandle), this.iframe && (this.iframe.onload = () => {
        this.isReady = !0, this.sendMessage({ type: "EDITOR_READY" }), this.updateDragHandlePosition();
      })) : document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", i) : setTimeout(i, 100);
    };
    i();
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
   * Send message to editor iframe
   */
  sendElementSelected(e) {
    this.sendMessage(e), this.show();
  }
  /**
   * Notify editor iframe that selection was cleared (selector deactivated)
   */
  sendClearSelectionAck() {
    this.sendMessage({ type: "CLEAR_SELECTION_ACK" });
  }
  sendTagPageSavedAck() {
    this.sendMessage({ type: "TAG_PAGE_SAVED_ACK" });
  }
  sendTagFeatureSavedAck() {
    this.sendMessage({ type: "TAG_FEATURE_SAVED_ACK" });
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
    const n = this.iframe.contentWindow;
    n && n.postMessage(e, "*");
  }
  /**
   * Load editor HTML content
   */
  loadEditorHtml() {
    this.loadEditorHtmlFallback();
  }
  /**
   * Fallback: Load editor HTML inline (embedded version)
   */
  loadEditorHtmlFallback() {
    const e = this.getEditorHtmlContent(), n = new Blob([e], { type: "text/html" }), i = URL.createObjectURL(n);
    this.iframe && (this.iframe.src = i);
  }
  /**
   * Get embedded editor HTML content
   * This is a fallback - in production, load from a static file
   */
  getEditorHtmlContent() {
    return this.mode === "tag-page" ? this.getTagPageHtmlContent() : this.mode === "tag-feature" ? this.getTagFeatureHtmlContent() : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Designer Editor</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"><\/script>
  <style>
    iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: #f8fafc; color: #111827; line-height: 1.5; height: 100%; overflow-y: auto; }
    .editor-container { display: flex; flex-direction: column; gap: 20px; max-width: 100%; min-height: 100%; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #e2e8f0; margin-bottom: 4px; }
    .header h2 { font-size: 18px; font-weight: 600; color: #0f172a; letter-spacing: -0.01em; }
    .close-btn { background: none; border: none; font-size: 22px; cursor: pointer; color: #64748b; padding: 4px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s; }
    .close-btn:hover { color: #0f172a; background: #f1f5f9; }
    .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .form-group:last-of-type { margin-bottom: 0; }
    label { font-size: 13px; font-weight: 600; color: #475569; letter-spacing: 0.01em; }
    input[type="text"], textarea { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Montserrat', inherit; transition: border-color 0.2s, box-shadow 0.2s; background: #fff; }
    input[type="text"]:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    textarea { resize: vertical; min-height: 88px; line-height: 1.5; }
    .selector-preview { padding: 10px 14px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-family: 'Monaco', 'Courier New', monospace; color: #475569; word-break: break-all; line-height: 1.4; }
    .element-info { padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 12px; }
    .element-info strong { display: block; margin-bottom: 6px; color: #1e40af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    .placement-group { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .placement-btn { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .placement-btn:hover { border-color: #3b82f6; background: #eff6ff; color: #1d4ed8; }
    .placement-btn.active { border-color: #3b82f6; background: #3b82f6; color: white; }
    .actions { display: flex; gap: 10px; padding-top: 16px; margin-top: 16px; border-top: 1px solid #e2e8f0; }
    .btn { flex: 1; padding: 11px 18px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }
    .btn-secondary { background: #f1f5f9; color: #475569; }
    .btn-secondary:hover { background: #e2e8f0; color: #0f172a; }
    .empty-state { text-align: center; padding: 40px 20px; color: #64748b; font-size: 14px; background: #f8fafc; border: 1px dashed #e2e8f0; border-radius: 12px; }
    .empty-state .select-element-btn { margin-top: 16px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; }
    .empty-state .select-element-btn:hover { background: #2563eb; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }
    .error { padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #b91c1c; font-size: 13px; display: none; margin-top: 12px; }
    .error.show { display: block; }
  </style>
</head>
<body>
  <div class="editor-container">
    <div class="header">
      <h2>Create Guide</h2>
      <button class="close-btn" id="closeBtn" aria-label="Close"><iconify-icon icon="mdi:close"></iconify-icon></button>
    </div>
    <div id="emptyState" class="empty-state">
      <div>Click on an element in the page to create a guide</div>
      <button type="button" class="select-element-btn" id="selectElementBtn">Select element</button>
    </div>
    <div id="editorForm" style="display: none;">
      <div class="form-group">
        <label>Selector</label>
        <div class="selector-preview" id="selectorPreview">-</div>
      </div>
      <div class="element-info" id="elementInfo" style="display: none;">
        <strong>Element Info</strong>
        <div id="elementInfoContent"></div>
      </div>
      <div class="form-group">
        <label for="guideContent">Guide Content</label>
        <textarea id="guideContent" placeholder="Enter the guide text that will be shown to users..." required></textarea>
      </div>
      <div class="form-group">
        <label>Placement</label>
        <div class="placement-group">
          <button class="placement-btn" data-placement="top">Top</button>
          <button class="placement-btn" data-placement="right">Right</button>
          <button class="placement-btn" data-placement="bottom">Bottom</button>
          <button class="placement-btn" data-placement="left">Left</button>
        </div>
      </div>
      <div class="error" id="errorMessage"></div>
      <div class="actions">
        <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
        <button class="btn btn-secondary" id="clearSelectionBtn">Clear Selection</button>
        <button class="btn btn-primary" id="saveBtn">Save Guide</button>
      </div>
    </div>
  </div>
  <script>
    let selectedPlacement = 'right';
    let currentSelector = '';
    let currentElementInfo = null;
    const placementButtons = document.querySelectorAll('.placement-btn');
    placementButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        placementButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPlacement = btn.dataset.placement;
      });
    });
    document.querySelector('[data-placement="right"]').classList.add('active');
    document.getElementById('closeBtn').addEventListener('click', () => sendMessage({ type: 'CANCEL' }));
    document.getElementById('cancelBtn').addEventListener('click', () => sendMessage({ type: 'CANCEL' }));
    document.getElementById('selectElementBtn').addEventListener('click', () => sendMessage({ type: 'ACTIVATE_SELECTOR' }));
    document.getElementById('clearSelectionBtn').addEventListener('click', () => sendMessage({ type: 'CLEAR_SELECTION_CLICKED' }));
    document.getElementById('saveBtn').addEventListener('click', () => {
      const content = document.getElementById('guideContent').value.trim();
      if (!content) { showError('Please enter guide content'); return; }
      if (!currentSelector) { showError('No element selected'); return; }
      sendMessage({ type: 'SAVE_GUIDE', guide: { page: window.location.pathname || '/', selector: currentSelector, content: content, placement: selectedPlacement, status: 'active' } });
    });
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'ELEMENT_SELECTED') {
        currentSelector = message.selector;
        currentElementInfo = message.elementInfo;
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('editorForm').style.display = 'block';
        document.getElementById('selectorPreview').textContent = currentSelector;
        if (currentElementInfo) {
          const infoContent = document.getElementById('elementInfoContent');
          infoContent.innerHTML = '<div><strong>Tag:</strong> ' + currentElementInfo.tagName + '</div>' + (currentElementInfo.id ? '<div><strong>ID:</strong> ' + currentElementInfo.id + '</div>' : '') + (currentElementInfo.className ? '<div><strong>Class:</strong> ' + currentElementInfo.className + '</div>' : '') + (currentElementInfo.textContent ? '<div><strong>Text:</strong> ' + currentElementInfo.textContent + '</div>' : '');
          document.getElementById('elementInfo').style.display = 'block';
        }
        document.getElementById('guideContent').value = '';
        hideError();
      }
      if (message.type === 'CLEAR_SELECTION_ACK') {
        currentSelector = '';
        currentElementInfo = null;
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('editorForm').style.display = 'none';
        document.getElementById('selectorPreview').textContent = '-';
        document.getElementById('elementInfo').style.display = 'none';
        hideError();
      }
    });
    function sendMessage(message) { window.parent.postMessage(message, '*'); }
    function showError(message) { const errorEl = document.getElementById('errorMessage'); errorEl.textContent = message; errorEl.classList.add('show'); }
    function hideError() { const errorEl = document.getElementById('errorMessage'); errorEl.classList.remove('show'); }
    window.addEventListener('load', () => sendMessage({ type: 'EDITOR_READY' }));
  <\/script>
</body>
  </html>`;
  }
  /**
   * Get Tag Page HTML content: overview (tagged / untagged) + form view
   */
  getTagPageHtmlContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tag Page - Visual Designer</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"><\/script>
  <style>
    iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; color: #111827; height: 100%; overflow-y: auto; line-height: 1.5; }
    .tag-page-container { display: flex; flex-direction: column; min-height: 100%; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
    .header h2 { font-size: 17px; font-weight: 600; color: #0f172a; }
    .header-actions { display: flex; align-items: center; gap: 8px; }
    .header-actions span { cursor: pointer; color: #64748b; font-size: 18px; padding: 4px 8px; border-radius: 6px; }
    .header-actions span:hover { background: #f1f5f9; color: #0f172a; }
    .content { flex: 1; padding: 20px; overflow-y: auto; }
    .tag-page-view { display: none; }
    .tag-page-view.active { display: flex; flex-direction: column; flex: 1; }
    .section-title { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .overview-tagged .current-url-card {
      display: flex; align-items: center; justify-content: space-between;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px;
      margin-bottom: 16px; cursor: pointer; transition: box-shadow 0.2s, border-color 0.2s;
    }
    .overview-tagged .current-url-card:hover { border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .current-url-card .left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
    .pill-tagged { background: #10b981; color: #fff; }
    .pill-untagged { background: #f59e0b; color: #fff; }
    .current-url-card .label { font-size: 14px; font-weight: 600; color: #0f172a; }
    .current-url-card .url { font-size: 13px; color: #64748b; margin-top: 4px; word-break: break-all; }
    .current-url-card .chevron { color: #94a3b8; font-size: 18px; flex-shrink: 0; }
    .overview-untagged { text-align: center; padding: 32px 24px; }
    .overview-untagged .illustration {
      width: 120px; height: 100px; margin: 0 auto 24px; background: linear-gradient(135deg, #e0e7ff 0%, #fce7f3 50%, #fef3c7 100%);
      border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 48px;
    }
    .overview-untagged h3 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
    .overview-untagged p { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }
    .tag-page-btn { width: 100%; padding: 12px 20px; background: #14b8a6; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; margin-top: 8px; }
    .tag-page-btn:hover { background: #0d9488; box-shadow: 0 4px 12px rgba(20,184,166,0.35); }
    .tagged-detail .back-link { display: block; color: #3b82f6; font-size: 13px; margin-bottom: 16px; text-decoration: none; }
    .tagged-detail .back-link:hover { text-decoration: underline; }
    .tagged-detail .current-url-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .tagged-detail .current-url-header .badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 8px; border-radius: 999px; background: #8b5cf6; color: #fff; font-size: 12px; font-weight: 600; }
    .tagged-detail .current-url-header h3 { font-size: 16px; font-weight: 600; color: #0f172a; }
    .tagged-detail .current-url-subtitle { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    .tagged-detail .search-wrap { position: relative; margin-bottom: 16px; }
    .tagged-detail .search-wrap input { width: 100%; padding: 10px 36px 10px 36px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Montserrat', inherit; }
    .tagged-detail .search-wrap .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 14px; pointer-events: none; }
    .tagged-detail .search-wrap .clear-btn { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); padding: 4px 8px; background: none; border: none; color: #64748b; font-size: 12px; cursor: pointer; }
    .tagged-detail .search-wrap .clear-btn:hover { color: #0f172a; }
    .tagged-detail .page-list-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; background: #fff; cursor: pointer; transition: border-color 0.2s; }
    .tagged-detail .page-list-item:hover { border-color: #cbd5e1; }
    .tagged-detail .page-list-item .name { font-size: 14px; font-weight: 500; color: #0f172a; flex: 1; }
    .tagged-detail .page-list-item .actions { display: flex; gap: 8px; }
    .tagged-detail .page-list-item .actions span { padding: 4px; cursor: pointer; color: #64748b; font-size: 14px; border-radius: 4px; }
    .tagged-detail .page-list-item .actions span:hover { color: #0f172a; background: #f1f5f9; }
    .tagged-detail .page-list-item .actions .delete:hover { color: #dc2626; background: #fef2f2; }
    .tag-page-form .section { margin-bottom: 24px; }
    .radio-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .radio-item { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .radio-item input { width: 16px; height: 16px; accent-color: #3b82f6; }
    .radio-item label { font-size: 14px; color: #0f172a; cursor: pointer; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .form-group label .required { color: #dc2626; }
    .form-group input, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Montserrat', inherit; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
    .form-group textarea { resize: vertical; min-height: 80px; }
    .rule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .rule-header span { font-size: 13px; font-weight: 600; color: #0f172a; }
    .rule-delete { cursor: pointer; color: #64748b; padding: 4px; border-radius: 4px; }
    .rule-delete:hover { color: #dc2626; background: #fef2f2; }
    .info-icon { color: #64748b; font-size: 14px; margin-left: 4px; cursor: help; }
    .error { font-size: 13px; color: #dc2626; margin-top: 6px; display: none; }
    .error.show { display: block; }
    .actions { display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid #e2e8f0; background: #fff; margin-top: auto; }
    .btn { flex: 1; padding: 12px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; transition: all 0.2s; }
    .btn-cancel { background: #f1f5f9; color: #475569; }
    .btn-cancel:hover { background: #e2e8f0; color: #0f172a; }
    .btn-save { background: #14b8a6; color: #fff; }
    .btn-save:hover { background: #0d9488; box-shadow: 0 4px 12px rgba(20,184,166,0.35); }
  </style>
</head>
<body>
  <div class="tag-page-container">
    <div class="header">
      <h2>Tag Page</h2>
      <div class="header-actions">
        <span title="Menu"><iconify-icon icon="mdi:dots-horizontal"></iconify-icon></span>
        <span class="minimize-btn" id="minimizeBtn" title="Minimize"><iconify-icon icon="mdi:window-minimize"></iconify-icon></span>
      </div>
    </div>
    <div class="content">
      <!-- Overview: current URL already tagged -->
      <div id="overviewTagged" class="tag-page-view overview-tagged">
        <div class="section-title">PAGES OVERVIEW</div>
        <div class="current-url-card" id="currentUrlCardTagged">
          <div class="left">
            <span class="pill pill-tagged">Tagged</span>
            <div>
              <div class="label">Current URL</div>
              <div class="url" id="currentUrlDisplayTagged">-</div>
            </div>
          </div>
          <span class="chevron"><iconify-icon icon="mdi:chevron-right"></iconify-icon></span>
        </div>
        <button type="button" class="tag-page-btn" id="tagPageBtnFromTagged">Tag Page</button>
      </div>
      <!-- Tagged URL detail: list of tagged pages for current URL -->
      <div id="taggedPagesDetailView" class="tag-page-view tagged-detail">
        <a href="#" class="back-link" id="backFromTaggedDetail"><iconify-icon icon="mdi:arrow-left"></iconify-icon> Back to overview</a>
        <div class="current-url-header">
          <span class="badge" id="taggedCountBadge">0</span>
          <h3>Current URL</h3>
        </div>
        <div class="current-url-subtitle">List of tagged Pages on this URL</div>
        <div class="search-wrap">
          <span class="search-icon"><iconify-icon icon="mdi:magnify"></iconify-icon></span>
          <input type="text" id="searchPagesInput" placeholder="Search Pages" />
          <button type="button" class="clear-btn" id="clearSearchBtn" style="display:none;">Clear</button>
        </div>
        <div id="taggedPagesList"></div>
        <button type="button" class="tag-page-btn" id="tagPageBtnFromDetail" style="margin-top:16px;">Tag Page</button>
      </div>
      <!-- Overview: current URL not tagged -->
      <div id="overviewUntagged" class="tag-page-view overview-untagged">
        <div class="illustration" aria-hidden="true"><iconify-icon icon="mdi:calendar" style="font-size:48px;"></iconify-icon></div>
        <h3>Let's start tagging!</h3>
        <p>Start by first tagging this page and then features to get going.</p>
        <button type="button" class="tag-page-btn" id="tagPageBtnFromUntagged">Tag Page</button>
      </div>
      <!-- Form: create/edit page -->
      <div id="tagPageFormView" class="tag-page-view tag-page-form">
        <a href="#" class="back-link" id="backFromTagPageForm" style="display:block;color:#3b82f6;font-size:13px;margin-bottom:16px;"><iconify-icon icon="mdi:arrow-left"></iconify-icon> Back</a>
        <div class="section">
          <div class="section-title">PAGE SETUP</div>
          <div class="radio-group">
            <div class="radio-item">
              <input type="radio" id="createNew" name="pageSetup" value="create" checked>
              <label for="createNew">Create New Page</label>
            </div>
            <div class="radio-item">
              <input type="radio" id="mergeExisting" name="pageSetup" value="merge">
              <label for="mergeExisting">Merge with Existing</label>
            </div>
          </div>
          <div class="form-group">
            <label>Page Name <span class="required">*</span></label>
            <input type="text" id="pageName" placeholder="Enter page name" required>
            <div class="error" id="pageNameError">This page name is already in use. Try another?</div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="pageDescription" placeholder="Click to add description"></textarea>
          </div>
        </div>
        <div class="section">
          <div class="section-title">INCLUDE PAGE RULES <span class="info-icon" title="Define how this page is identified"><iconify-icon icon="mdi:information-outline"></iconify-icon></span></div>
          <div class="rule-header">
            <span>Include Rule 1</span>
            <span class="rule-delete" id="deleteRule1" title="Delete rule"><iconify-icon icon="mdi:delete-outline"></iconify-icon></span>
          </div>
          <div class="radio-group">
            <div class="radio-item">
              <input type="radio" id="suggestedMatch" name="ruleType" value="suggested" checked>
              <label for="suggestedMatch">Suggested Match</label>
            </div>
            <div class="radio-item">
              <input type="radio" id="exactMatch" name="ruleType" value="exact">
              <label for="exactMatch">Exact Match</label>
            </div>
            <div class="radio-item">
              <input type="radio" id="ruleBuilder" name="ruleType" value="builder">
              <label for="ruleBuilder">Rule Builder</label>
            </div>
          </div>
          <div class="form-group">
            <label>Selection URL</label>
            <input type="text" id="selectionUrl" placeholder="e.g. //*/path/to/page">
          </div>
        </div>
      </div>
    </div>
    <div class="actions" id="tagPageFormActions" style="display: none;">
      <button class="btn btn-cancel" id="cancelBtn">Cancel</button>
      <button class="btn btn-save" id="saveBtn">Save</button>
    </div>
  </div>
  <script>
    function sendMessage(m) { window.parent.postMessage(m, '*'); }
    var STORAGE_KEY = 'designerTaggedPages';
    function getCurrentUrl() {
      try {
        var p = window.parent.location;
        return (p.host || p.hostname || '') + (p.pathname || '/') + (p.search || '') + (p.hash || '');
      } catch (e) { return window.location.href || ''; }
    }
    function normalizeUrl(u) {
      u = (u || '').replace(/^https?:\\/\\//i, '').replace(/\\/$/, '');
      return u || '';
    }
    function getTaggedPages() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY) || '[]';
        return JSON.parse(raw);
      } catch (e) { return []; }
    }
    function isCurrentUrlTagged() {
      var current = normalizeUrl(getCurrentUrl());
      var list = getTaggedPages();
      return list.some(function(p) { return p && normalizeUrl(p.url) === current; });
    }
    function showView(viewId) {
      document.querySelectorAll('.tag-page-view').forEach(function(el) { el.classList.remove('active'); });
      var el = document.getElementById(viewId);
      if (el) el.classList.add('active');
      document.getElementById('tagPageFormActions').style.display = viewId === 'tagPageFormView' ? 'flex' : 'none';
    }
    function refreshOverview() {
      var tagged = isCurrentUrlTagged();
      showView(tagged ? 'overviewTagged' : 'overviewUntagged');
      document.getElementById('currentUrlDisplayTagged').textContent = getCurrentUrl() || '(current page)';
    }
    function getPagesForCurrentUrl() {
      var current = normalizeUrl(getCurrentUrl());
      return getTaggedPages().filter(function(p) { return p && normalizeUrl(p.url) === current; });
    }
    function renderTaggedPagesList(filter) {
      var pages = getPagesForCurrentUrl();
      var q = (filter || '').toLowerCase().trim();
      if (q) pages = pages.filter(function(p) { return (p.pageName || '').toLowerCase().indexOf(q) !== -1; });
      var list = document.getElementById('taggedPagesList');
      list.innerHTML = '';
      pages.forEach(function(p) {
        var name = p.pageName || 'Unnamed';
        var item = document.createElement('div');
        item.className = 'page-list-item';
        item.innerHTML = '<span class="name">' + escapeHtml(name) + '</span>' +
          '<div class="actions">' +
          '<span class="edit" title="Edit" data-page-name="' + escapeHtml(name) + '"><iconify-icon icon="mdi:pencil"></iconify-icon></span>' +
          '<span class="delete" title="Delete" data-page-name="' + escapeHtml(name) + '"><iconify-icon icon="mdi:delete-outline"></iconify-icon></span>' +
          '</div>';
        list.appendChild(item);
      });
    }
    function escapeHtml(s) {
      var div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }
    function showTaggedDetailView() {
      var pages = getPagesForCurrentUrl();
      showView('taggedPagesDetailView');
      document.getElementById('taggedCountBadge').textContent = String(pages.length);
      document.getElementById('searchPagesInput').value = '';
      document.getElementById('clearSearchBtn').style.display = 'none';
      renderTaggedPagesList('');
    }
    document.getElementById('minimizeBtn').addEventListener('click', function() { sendMessage({ type: 'CANCEL' }); });
    function getSuggestedSelectionUrl() {
      try {
        var p = window.parent.location;
        var path = (p.pathname || '/').replace(/^\\//, '');
        var search = p.search || '';
        var hash = p.hash || '';
        return '//*/' + path + search + hash;
      } catch (e) { return '//*/'; }
    }
    function showTagPageForm() {
      showView('tagPageFormView');
      document.getElementById('tagPageFormActions').style.display = 'flex';
      document.getElementById('selectionUrl').value = getSuggestedSelectionUrl();
    }
    document.getElementById('currentUrlCardTagged').addEventListener('click', showTaggedDetailView);
    document.getElementById('searchPagesInput').addEventListener('input', function() {
      var val = this.value;
      document.getElementById('clearSearchBtn').style.display = val ? 'block' : 'none';
      renderTaggedPagesList(val);
    });
    document.getElementById('clearSearchBtn').addEventListener('click', function() {
      document.getElementById('searchPagesInput').value = '';
      this.style.display = 'none';
      renderTaggedPagesList('');
    });
    document.getElementById('taggedPagesList').addEventListener('click', function(e) {
      var target = e.target;
      if (!target || !target.closest) return;
      var editBtn = target.closest('.edit');
      var deleteBtn = target.closest('.delete');
      if (editBtn) {
        var pageName = editBtn.getAttribute('data-page-name');
        if (pageName) sendMessage({ type: 'EDIT_TAG_PAGE', payload: { pageName: pageName } });
      }
      if (deleteBtn) {
        var pageName = deleteBtn.getAttribute('data-page-name');
        if (pageName && window.confirm('Delete page "' + pageName + '"?')) {
          var current = normalizeUrl(getCurrentUrl());
          var list = getTaggedPages().filter(function(p) {
            return !(p && p.pageName === pageName && normalizeUrl(p.url) === current);
          });
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            var remaining = getPagesForCurrentUrl();
            if (remaining.length === 0) {
              refreshOverview();
            } else {
              document.getElementById('taggedCountBadge').textContent = String(remaining.length);
              renderTaggedPagesList(document.getElementById('searchPagesInput').value);
            }
          } catch (err) {}
        }
      }
    });
    document.getElementById('tagPageBtnFromTagged').addEventListener('click', showTagPageForm);
    document.getElementById('tagPageBtnFromUntagged').addEventListener('click', showTagPageForm);
    document.getElementById('tagPageBtnFromDetail').addEventListener('click', showTagPageForm);
    document.getElementById('backFromTaggedDetail').addEventListener('click', function(e) { e.preventDefault(); refreshOverview(); });
    document.getElementById('backFromTagPageForm').addEventListener('click', function(e) { e.preventDefault(); refreshOverview(); document.getElementById('tagPageFormActions').style.display = 'none'; });
    document.getElementById('cancelBtn').addEventListener('click', function() { refreshOverview(); });
    document.getElementById('saveBtn').addEventListener('click', function() {
      var pageName = document.getElementById('pageName').value.trim();
      var pageNameError = document.getElementById('pageNameError');
      if (!pageName) { pageNameError.classList.add('show'); return; }
      pageNameError.classList.remove('show');
      var pageSetup = document.querySelector('input[name="pageSetup"]:checked').value;
      var description = document.getElementById('pageDescription').value.trim();
      var ruleType = document.querySelector('input[name="ruleType"]:checked').value;
      var selectionUrl = document.getElementById('selectionUrl').value.trim();
      sendMessage({
        type: 'SAVE_TAG_PAGE',
        payload: {
          pageSetup: pageSetup,
          pageName: pageName,
          description: description || undefined,
          includeRules: [{ ruleType: ruleType, selectionUrl: selectionUrl || '' }]
        }
      });
    });
    window.addEventListener('message', function(event) {
      var d = event.data;
      if (d && d.type === 'TAG_PAGE_SAVED_ACK') { refreshOverview(); }
    });
    var lastKnownUrl = '';
    function checkUrlChange() {
      var current = getCurrentUrl();
      if (current !== lastKnownUrl) {
        lastKnownUrl = current;
        refreshOverview();
      }
    }
    function startUrlChangeDetection() {
      lastKnownUrl = getCurrentUrl();
      try {
        window.parent.addEventListener('hashchange', checkUrlChange);
        window.parent.addEventListener('popstate', checkUrlChange);
      } catch (e) {}
      setInterval(checkUrlChange, 1500);
    }
    window.addEventListener('load', function() {
      refreshOverview();
      lastKnownUrl = getCurrentUrl();
      startUrlChangeDetection();
      sendMessage({ type: 'EDITOR_READY' });
    });
  <\/script>
</body>
</html>`;
  }
  /**
   * Get Tag Feature HTML content: Features tab overview + selector form when "Tag Feature" is clicked
   */
  getTagFeatureHtmlContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tag Feature - Visual Designer</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://code.iconify.design/iconify-icon/3.0.2/iconify-icon.min.js"><\/script>
  <style>
    iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #111827; height: 100%; overflow-y: auto; line-height: 1.5; }
    .tag-feature-container { display: flex; flex-direction: column; min-height: 100%; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
    .header h2 { font-size: 17px; font-weight: 600; color: #0f172a; }
    .header-actions { display: flex; align-items: center; gap: 8px; }
    .header-actions span { cursor: pointer; color: #64748b; font-size: 18px; padding: 4px 8px; border-radius: 6px; }
    .header-actions span:hover { background: #f1f5f9; color: #0f172a; }
    .tabs { display: flex; gap: 0; border-bottom: 1px solid #e2e8f0; padding: 0 20px; }
    .tab { padding: 14px 20px; background: none; border: none; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; position: relative; font-family: 'Montserrat', inherit; }
    .tab:hover { color: #0f172a; }
    .tab.active { color: #0f172a; font-weight: 600; }
    .tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 3px; background: #14b8a6; border-radius: 3px 3px 0 0; }
    .content { flex: 1; overflow-y: auto; padding: 24px 20px; background: #f8fafc; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .section-title { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; margin-top: 20px; }
    .section-title:first-child { margin-top: 0; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .card-content { display: flex; align-items: center; justify-content: space-between; }
    .card-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 12px; font-weight: 600; min-width: 28px; height: 28px; padding: 0 10px; color: #fff; flex-shrink: 0; }
    .badge-teal { background: #14b8a6; }
    .badge-purple { background: #8b5cf6; }
    .card-text { flex: 1; min-width: 0; }
    .card-title { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
    .card-description { font-size: 13px; color: #64748b; line-height: 1.4; }
    .chevron { color: #94a3b8; font-size: 18px; flex-shrink: 0; }
    .heatmap-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; border-top: 1px solid #e2e8f0; margin-top: 24px; }
    .heatmap-label { font-size: 14px; font-weight: 500; color: #0f172a; }
    .heatmap-controls { display: flex; align-items: center; gap: 12px; }
    .toggle-switch { position: relative; width: 44px; height: 24px; background: #cbd5e1; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
    .toggle-switch.active { background: #10b981; }
    .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
    .toggle-switch.active::after { transform: translateX(20px); }
    .plus-icon { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; font-size: 18px; transition: all 0.2s; background: #fff; }
    .plus-icon:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
    .tag-feature-btn { width: 100%; padding: 12px 20px; background: #14b8a6; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; margin-top: 24px; box-shadow: 0 2px 8px rgba(20,184,166,0.25); }
    .tag-feature-btn:hover { background: #0d9488; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(20,184,166,0.35); }
    .overview-actions { display: flex; gap: 12px; margin-top: 24px; }
    .overview-actions .tag-feature-btn { margin-top: 0; flex: 1; }
    .clear-selection-btn { padding: 12px 20px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Montserrat', inherit; transition: all 0.2s; }
    .clear-selection-btn:hover { background: #e2e8f0; color: #0f172a; }
    .view { display: none; }
    .view.active { display: flex; flex-direction: column; min-height: 100%; }
    .selector-form .form-group { margin-bottom: 16px; }
    .selector-form label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .selector-form label .required { color: #dc2626; }
    .selector-form input { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Montserrat', inherit; }
    .selector-preview { padding: 10px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-family: monospace; color: #475569; word-break: break-all; }
    .element-info { padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 12px; color: #1e40af; margin-top: 8px; }
    .error { font-size: 13px; color: #dc2626; margin-top: 6px; display: none; }
    .error.show { display: block; }
    .form-actions { display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid #e2e8f0; margin-top: auto; }
    .btn { flex: 1; padding: 12px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    .btn-cancel { background: #f1f5f9; color: #475569; }
    .btn-cancel:hover { background: #e2e8f0; color: #0f172a; }
    .btn-save { background: #14b8a6; color: #fff; }
    .btn-save:hover { background: #0d9488; box-shadow: 0 4px 12px rgba(20,184,166,0.35); }
    .back-link { color: #3b82f6; font-size: 13px; cursor: pointer; margin-bottom: 16px; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="tag-feature-container">
    <div class="header">
      <h2>Manage Pages, Features, and AI agents</h2>
      <div class="header-actions">
        <span title="Menu"><iconify-icon icon="mdi:dots-horizontal"></iconify-icon></span>
        <span id="minimizeBtn" title="Minimize"><iconify-icon icon="mdi:window-minimize"></iconify-icon></span>
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="features">Features</button>
      <button class="tab" data-tab="pages">Pages</button>
      <button class="tab" data-tab="ai-agents">AI agents</button>
    </div>
    <div class="content">
      <div id="overviewView" class="view active" style="display: block;">
        <div id="featuresTab" class="tab-content active">
          <div class="section-title">FEATURES OVERVIEW</div>
          <div class="card">
            <div class="card-content">
              <div class="card-left">
                <span class="badge badge-teal" id="suggestedCount">7</span>
                <div class="card-text">
                  <div class="card-title">Suggested Features</div>
                  <div class="card-description">List of untagged elements on this page</div>
                </div>
              </div>
              <span class="chevron"><iconify-icon icon="mdi:chevron-right"></iconify-icon></span>
            </div>
          </div>
          <div class="card">
            <div class="card-content">
              <div class="card-left">
                <span class="badge badge-purple" id="taggedCount">111</span>
                <div class="card-text">
                  <div class="card-title">Tagged Features</div>
                  <div class="card-description">List of tagged Features on this page</div>
                </div>
              </div>
              <span class="chevron"><iconify-icon icon="mdi:chevron-right"></iconify-icon></span>
            </div>
          </div>
          <div class="heatmap-row">
            <span class="heatmap-label">Heatmap</span>
            <div class="heatmap-controls">
              <div class="toggle-switch" id="heatmapToggle"></div>
              <div class="plus-icon"><iconify-icon icon="mdi:plus"></iconify-icon></div>
            </div>
          </div>
          <div class="overview-actions">
            <button class="tag-feature-btn" id="tagFeatureBtn">Tag Feature</button>
            <button class="clear-selection-btn" id="overviewClearSelectionBtn">Clear Selection</button>
          </div>
        </div>
      </div>
      <div id="selectorFormView" class="view" style="display: none;">
        <div style="padding: 20px; flex: 1;">
          <a class="back-link" id="backFromForm"><iconify-icon icon="mdi:arrow-left"></iconify-icon> Back to overview</a>
          <h3 style="margin-bottom: 16px; font-size: 16px;">Tag Feature</h3>
          <div class="selector-form">
            <div class="form-group">
              <label>Selector</label>
              <div class="selector-preview" id="selectorPreview">-</div>
            </div>
            <div class="form-group" id="elementInfoGroup" style="display: none;">
              <label>Element info</label>
              <div class="element-info" id="elementInfoContent"></div>
            </div>
            <div class="form-group">
              <label>Feature Name <span class="required">*</span></label>
              <input type="text" id="featureNameInput" placeholder="Enter feature name">
              <div class="error" id="featureNameError">Please enter a feature name.</div>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" id="formCancelBtn">Cancel</button>
          <button class="btn btn-cancel" id="clearSelectionBtn">Clear Selection</button>
          <button class="btn btn-save" id="formSaveBtn">Save</button>
        </div>
      </div>
    </div>
  </div>
  <script>
    function sendMessage(m) { window.parent.postMessage(m, '*'); }
    var FEATURES_STORAGE_KEY = 'designerTaggedFeatures';
    var HEATMAP_STORAGE_KEY = 'designerHeatmapEnabled';
    var currentSelector = '';
    var currentElementInfo = null;
    function getCurrentUrl() {
      try {
        var p = window.parent.location;
        return (p.host || p.hostname || '') + (p.pathname || '/') + (p.search || '') + (p.hash || '');
      } catch (e) { return window.location.href || ''; }
    }
    function normalizeUrl(u) {
      u = (u || '').replace(/^https?:\\/\\//i, '').replace(/\\/$/, '');
      return u || '';
    }
    function getTaggedFeatures() {
      try {
        var raw = localStorage.getItem(FEATURES_STORAGE_KEY) || '[]';
        return JSON.parse(raw);
      } catch (e) { return []; }
    }
    function getFeaturesForCurrentUrl() {
      var current = normalizeUrl(getCurrentUrl());
      return getTaggedFeatures().filter(function(f) { return f && normalizeUrl(f.url) === current; });
    }
    function refreshTaggedCount() {
      var count = getFeaturesForCurrentUrl().length;
      document.getElementById('taggedCount').textContent = String(count);
    }
    function showOverview() {
      document.getElementById('overviewView').style.display = 'block';
      document.getElementById('selectorFormView').style.display = 'none';
      currentSelector = '';
      currentElementInfo = null;
      document.getElementById('selectorPreview').textContent = '-';
      document.getElementById('elementInfoGroup').style.display = 'none';
      document.getElementById('featureNameInput').value = '';
      document.getElementById('featureNameError').classList.remove('show');
      refreshTaggedCount();
    }
    document.getElementById('minimizeBtn').addEventListener('click', function() { sendMessage({ type: 'CANCEL' }); });
    document.getElementById('tagFeatureBtn').addEventListener('click', function() {
      sendMessage({ type: 'TAG_FEATURE_CLICKED' });
    });
    document.getElementById('overviewClearSelectionBtn').addEventListener('click', function() {
      sendMessage({ type: 'CLEAR_SELECTION_CLICKED' });
    });
    document.getElementById('clearSelectionBtn').addEventListener('click', function() {
      sendMessage({ type: 'CLEAR_SELECTION_CLICKED' });
    });
    document.querySelectorAll('.tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var t = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        var panel = document.getElementById(t + 'Tab');
        if (panel) panel.classList.add('active');
      });
    });
    document.getElementById('heatmapToggle').addEventListener('click', function() {
      this.classList.toggle('active');
      var enabled = this.classList.contains('active');
      try { localStorage.setItem(HEATMAP_STORAGE_KEY, String(enabled)); } catch (e) {}
      sendMessage({ type: 'HEATMAP_TOGGLE', enabled: enabled });
    });
    document.getElementById('backFromForm').addEventListener('click', function() { showOverview(); });
    document.getElementById('formCancelBtn').addEventListener('click', function() { showOverview(); });
    document.getElementById('formSaveBtn').addEventListener('click', function() {
      var name = (document.getElementById('featureNameInput').value || '').trim();
      var err = document.getElementById('featureNameError');
      if (!name) { err.classList.add('show'); return; }
      err.classList.remove('show');
      sendMessage({
        type: 'SAVE_TAG_FEATURE',
        payload: {
          featureName: name,
          selector: currentSelector,
          elementInfo: currentElementInfo
        }
      });
    });
    window.addEventListener('message', function(event) {
      var d = event.data;
      if (!d) return;
      if (d.type === 'ELEMENT_SELECTED') {
        currentSelector = d.selector || '';
        currentElementInfo = d.elementInfo || null;
        document.getElementById('selectorPreview').textContent = currentSelector || '-';
        var infoEl = document.getElementById('elementInfoContent');
        var infoGroup = document.getElementById('elementInfoGroup');
        if (currentElementInfo) {
          var tag = currentElementInfo.tagName || '';
          var id = currentElementInfo.id || '';
          var cls = (currentElementInfo.className || (currentElementInfo.attributes && currentElementInfo.attributes.class)) || '';
          var text = (currentElementInfo.textContent || '').slice(0, 80);
          infoEl.innerHTML = 'Tag: ' + tag + (id ? ' | ID: ' + id : '') + (cls ? ' | Class: ' + cls : '') + (text ? ' | Text: ' + text : '');
          infoGroup.style.display = 'block';
        } else {
          infoGroup.style.display = 'none';
        }
        document.getElementById('featureNameInput').value = '';
        document.getElementById('featureNameError').classList.remove('show');
        document.getElementById('overviewView').style.display = 'none';
        document.getElementById('selectorFormView').style.display = 'flex';
      }
      if (d.type === 'CLEAR_SELECTION_ACK') {
        showOverview();
      }
      if (d.type === 'TAG_FEATURE_SAVED_ACK') {
        showOverview();
      }
    });
    window.addEventListener('load', function() {
      refreshTaggedCount();
      var heatmapEnabled = localStorage.getItem(HEATMAP_STORAGE_KEY) === 'true';
      var toggleEl = document.getElementById('heatmapToggle');
      if (heatmapEnabled && toggleEl) toggleEl.classList.add('active');
      sendMessage({ type: 'EDITOR_READY' });
    });
  <\/script>
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
    const n = document.createElement("iconify-icon");
    n.setAttribute("icon", "pepicons-print:dots-x"), n.style.cssText = "font-size: 18px; color: #64748b; pointer-events: none;", e.appendChild(n), this.dragHandle.appendChild(e), this.gripButton = e, e.addEventListener("mousedown", this.handleMouseDown, !0), document.addEventListener("mousemove", this.handleMouseMove, !0), document.addEventListener("mouseup", this.handleMouseUp, !0), window.addEventListener("mousemove", this.handleMouseMove, !0), window.addEventListener("mouseup", this.handleMouseUp, !0);
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
    const n = this.iframe.getBoundingClientRect();
    this.dragStartX = e.clientX - n.left, this.dragStartY = e.clientY - n.top, e.preventDefault(), e.stopPropagation();
  };
  /**
   * Handle mouse move during drag
   */
  handleMouseMove = (e) => {
    if (!this.isMouseDown || !this.iframe || !this.dragHandle)
      return;
    if (!this.isDragging) {
      const d = Math.abs(e.clientX - this.mouseDownX), c = Math.abs(e.clientY - this.mouseDownY);
      if (Math.sqrt(d * d + c * c) > this.dragThreshold)
        this.isDragging = !0, document.body.style.cursor = "grabbing", document.documentElement.style.cursor = "grabbing", document.body.style.userSelect = "none", document.documentElement.style.userSelect = "none", this.iframe && (this.iframe.style.pointerEvents = "none"), this.gripButton && (this.gripButton.style.cursor = "grabbing");
      else
        return;
    }
    e.preventDefault(), e.stopPropagation();
    const n = e.clientX - this.dragStartX, i = e.clientY - this.dragStartY, o = window.innerWidth, r = window.innerHeight, s = this.iframe.offsetWidth, l = Math.max(-s + 50, Math.min(n, o - 50)), g = Math.max(0, Math.min(i, r - 100));
    this.iframe.style.left = `${l}px`, this.iframe.style.top = `${g}px`, this.iframe.style.right = "auto", this.iframe.style.bottom = "auto", this.dragHandle.style.left = `${l}px`, this.dragHandle.style.top = `${g}px`;
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
    const n = e.data;
    !n || !n.type || (this.messageCallback && this.messageCallback(n), (n.type === "CANCEL" || n.type === "GUIDE_SAVED") && this.hide());
  };
}
const Ke = "visual-designer-guides", ce = "1.0.0";
class Ye {
  storageKey;
  constructor(e = Ke) {
    this.storageKey = e;
  }
  getGuides() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const n = JSON.parse(e);
      return n.version !== ce ? (this.clear(), []) : n.guides || [];
    } catch {
      return [];
    }
  }
  getGuidesByPage(e) {
    return this.getGuides().filter((i) => i.page === e && i.status === "active");
  }
  saveGuide(e) {
    const n = this.getGuides(), i = n.findIndex((r) => r.id === e.id), o = {
      ...e,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: e.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    i >= 0 ? n[i] = o : n.push(o), this.saveGuides(n);
  }
  deleteGuide(e) {
    const n = this.getGuides().filter((i) => i.id !== e);
    this.saveGuides(n);
  }
  saveGuides(e) {
    const n = { guides: e, version: ce };
    localStorage.setItem(this.storageKey, JSON.stringify(n));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(e) {
    return this.getGuides().find((n) => n.id === e) || null;
  }
}
function je({ onExit: t }) {
  const e = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: p.bg,
    border: `2px solid ${p.primary}`,
    borderRadius: p.borderRadius,
    color: p.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: p.fontFamily,
    cursor: "pointer",
    zIndex: String(p.zIndex.controls),
    boxShadow: p.shadow,
    transition: "all 0.2s ease",
    pointerEvents: "auto"
  };
  return /* @__PURE__ */ v(
    "button",
    {
      id: "designer-exit-editor-btn",
      style: e,
      onClick: t,
      onMouseEnter: (n) => {
        n.currentTarget.style.background = p.primary, n.currentTarget.style.color = p.bg, n.currentTarget.style.transform = "translateY(-2px)", n.currentTarget.style.boxShadow = p.shadowHover;
      },
      onMouseLeave: (n) => {
        n.currentTarget.style.background = p.bg, n.currentTarget.style.color = p.primary, n.currentTarget.style.transform = "translateY(0)", n.currentTarget.style.boxShadow = p.shadow;
      },
      children: [
        /* @__PURE__ */ v("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function We() {
  return /* @__PURE__ */ v(
    "div",
    {
      id: "designer-red-border-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: `5px solid ${p.primary}`,
        pointerEvents: "none",
        zIndex: p.zIndex.highlight - 1,
        boxSizing: "border-box"
      }
    }
  );
}
function Xe() {
  return /* @__PURE__ */ v(
    "div",
    {
      id: "designer-studio-badge",
      style: {
        position: "fixed",
        top: "4px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "0px 10px 3px",
        background: p.primary,
        color: p.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: p.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${p.primary}`,
        borderTop: "none",
        zIndex: p.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function qe() {
  return /* @__PURE__ */ v(
    "div",
    {
      id: "designer-loading-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(255, 255, 255, 0.95)",
        zIndex: p.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: p.fontFamily
      },
      children: [
        /* @__PURE__ */ v(
          "div",
          {
            style: {
              width: 48,
              height: 48,
              border: "4px solid #e2e8f0",
              borderTopColor: p.primary,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: 16
            }
          }
        ),
        /* @__PURE__ */ v("style", { children: "@keyframes spin { to { transform: rotate(360deg); } }" }),
        /* @__PURE__ */ v(
          "div",
          {
            style: {
              color: "#1e40af",
              fontSize: 16,
              fontWeight: 500,
              fontFamily: p.fontFamily
            },
            children: "Loading Visual Designer..."
          }
        )
      ]
    }
  );
}
function Je(t) {
  return /* @__PURE__ */ v(z, { children: [
    t.showExitButton && /* @__PURE__ */ v(je, { onExit: t.onExitEditor }),
    t.showRedBorder && /* @__PURE__ */ v(We, {}),
    t.showBadge && /* @__PURE__ */ v(Xe, {}),
    t.showLoading && /* @__PURE__ */ v(qe, {})
  ] });
}
function Qe(t, e) {
  P(/* @__PURE__ */ v(Je, { ...e }), t);
}
class we {
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
  constructor(e = {}) {
    this.config = e, this.storage = new Ye(e.storageKey), this.editorMode = new Le(), this.guideRenderer = new Ne(), this.featureHeatmapRenderer = new Ve(), this.editorFrame = new $e();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((n) => this.config.onGuideDismissed?.(n)), this.shouldEnableEditorMode() ? (this.showLoading = !0, this.renderOverlays(), this.enableEditor()) : this.loadGuides(), this.heatmapEnabled = localStorage.getItem("designerHeatmapEnabled") === "true", this.renderFeatureHeatmap(), this.setupEventListeners();
  }
  enableEditor() {
    if (this.isEditorMode) return;
    this.isEditorMode = !0;
    let e = typeof window < "u" && window.__visualDesignerMode || null;
    e || (e = localStorage.getItem("designerModeType") || null), this.editorFrame.create((i) => this.handleEditorMessage(i), e);
    const n = e === "tag-page" || e === "tag-feature";
    n || this.editorMode.activate((i) => this.handleEditorMessage(i)), this.ensureSDKRoot(), this.showLoading = !1, this.renderOverlays(), localStorage.setItem("designerMode", "true"), e && localStorage.setItem("designerModeType", e), setTimeout(() => {
      this.editorFrame.show(), this.renderOverlays();
    }, n ? 100 : 300);
  }
  disableEditor() {
    if (this.isEditorMode) {
      try {
        window.close();
      } catch {
      }
      this.isEditorMode = !1, this.editorMode.deactivate(), this.editorFrame.destroy(), this.featureHeatmapRenderer.destroy(), this.showLoading = !1, localStorage.removeItem("designerMode"), localStorage.removeItem("designerModeType"), this.renderOverlays(), this.loadGuides();
    }
  }
  getGuides() {
    return this.storage.getGuides();
  }
  getGuidesForCurrentPage() {
    return this.storage.getGuidesByPage(K());
  }
  saveGuide(e) {
    const n = {
      ...e,
      id: ne(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return this.storage.saveGuide(n), this.isEditorMode || this.loadGuides(), this.config.onGuideSaved?.(n), n;
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
        this.editorMode.activate((n) => this.handleEditorMessage(n));
        break;
      case "ACTIVATE_SELECTOR":
        this.editorMode.activate((n) => this.handleEditorMessage(n));
        break;
      case "CLEAR_SELECTION_CLICKED":
        this.editorMode.deactivate(), this.editorFrame.sendClearSelectionAck();
        break;
      case "SAVE_TAG_PAGE":
        this.handleSaveTagPage(e);
        break;
      case "SAVE_TAG_FEATURE":
        this.handleSaveTagFeature(e);
        break;
      case "HEATMAP_TOGGLE":
        this.handleHeatmapToggle(e.enabled);
        break;
      case "CANCEL":
        this.editorFrame.hide();
        break;
      case "EXIT_EDITOR_MODE":
        this.disableEditor();
        break;
      case "EDITOR_READY":
        this.showLoading = !1, this.renderOverlays();
        break;
    }
  }
  handleElementSelected(e) {
    this.editorFrame.sendElementSelected(e);
  }
  handleSaveGuide(e) {
    this.saveGuide({
      ...e.guide,
      page: K()
    });
  }
  handleSaveTagPage(e) {
    const n = "designerTaggedPages";
    try {
      const i = localStorage.getItem(n) || "[]", o = JSON.parse(i), r = typeof window < "u" ? window.location.href : "";
      o.push({ pageName: e.payload.pageName, url: r }), localStorage.setItem(n, JSON.stringify(o));
    } catch {
    }
    this.editorFrame.sendTagPageSavedAck();
  }
  handleSaveTagFeature(e) {
    const n = "designerTaggedFeatures", i = e.payload;
    if (!(!i.selector || !i.featureName))
      try {
        const o = localStorage.getItem(n) || "[]", r = JSON.parse(o), s = typeof window < "u" ? window.location.href : "", l = {
          id: ne(),
          featureName: i.featureName,
          selector: i.selector,
          url: s,
          elementInfo: i.elementInfo,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        r.push(l), localStorage.setItem(n, JSON.stringify(r)), this.editorFrame.sendTagFeatureSavedAck(), this.renderFeatureHeatmap();
      } catch {
      }
  }
  handleHeatmapToggle(e) {
    this.heatmapEnabled = e;
    try {
      localStorage.setItem("designerHeatmapEnabled", String(e));
    } catch {
    }
    this.renderFeatureHeatmap();
  }
  getTaggedFeatures() {
    try {
      const e = localStorage.getItem("designerTaggedFeatures") || "[]";
      return JSON.parse(e);
    } catch {
      return [];
    }
  }
  renderFeatureHeatmap() {
    this.featureHeatmapRenderer.render(this.getTaggedFeatures(), this.heatmapEnabled);
  }
  setupEventListeners() {
    let e, n;
    const i = () => {
      this.guideRenderer.updatePositions(this.storage.getGuides());
    }, o = () => {
      this.featureHeatmapRenderer.updatePositions(this.getTaggedFeatures());
    };
    window.addEventListener("resize", () => {
      clearTimeout(e), e = window.setTimeout(() => {
        i(), o();
      }, 100);
    }), window.addEventListener(
      "scroll",
      () => {
        clearTimeout(n), n = window.setTimeout(() => {
          i(), o();
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
    this.ensureSDKRoot(), this.sdkRoot && Qe(this.sdkRoot, {
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
let _ = null, Ee = !1;
function C(t) {
  return _ || (_ = new we(t), _.init(), _);
}
function ke() {
  return _;
}
function Se(t) {
  !t || !Array.isArray(t) || t.forEach((e) => {
    if (!e || !Array.isArray(e) || e.length === 0) return;
    const n = e[0], i = e.slice(1);
    try {
      switch (n) {
        case "initialize":
          C(i[0]);
          break;
        case "identify":
          i[0] && console.log("[Visual Designer] identify (snippet) called with:", i[0]);
          break;
        case "enableEditor":
          (_ ?? C()).enableEditor();
          break;
        case "disableEditor":
          _?.disableEditor();
          break;
        case "loadGuides":
          _?.loadGuides();
          break;
        case "getGuides":
          return _?.getGuides();
        default:
          console.warn("[Visual Designer] Unknown snippet method:", n);
      }
    } catch (o) {
      console.error("[Visual Designer] Error processing queued call:", n, o);
    }
  });
}
if (typeof window < "u") {
  const t = window.visualDesigner;
  t && Array.isArray(t._q) && (Ee = !0, t.initialize = (e) => C(e), t.identify = (e) => {
    e && console.log("[Visual Designer] identify (snippet) called with:", e);
  }, t.enableEditor = () => (_ ?? C()).enableEditor(), t.disableEditor = () => _?.disableEditor(), t.loadGuides = () => _?.loadGuides(), t.getGuides = () => _?.getGuides(), t.getInstance = ke, t.init = C, Se(t._q));
  try {
    const e = new URL(window.location.href), n = e.searchParams.get("designer"), i = e.searchParams.get("mode");
    n === "true" && (i && (window.__visualDesignerMode = i, localStorage.setItem("designerModeType", i)), localStorage.setItem("designerMode", "true"), e.searchParams.delete("designer"), e.searchParams.delete("mode"), window.history.replaceState({}, "", e.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !_ && !Ee) {
  const t = () => {
    _ || C();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t) : t();
}
typeof window < "u" && (window.VisualDesigner = {
  init: C,
  initialize: C,
  getInstance: ke,
  DesignerSDK: we,
  _processQueue: Se
});
export {
  we as DesignerSDK,
  Se as _processQueue,
  ke as getInstance,
  C as init
};
