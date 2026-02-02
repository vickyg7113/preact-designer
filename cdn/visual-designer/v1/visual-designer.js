class pe {
  static generateSelector(e) {
    if (e.id)
      return {
        selector: `#${this.escapeSelector(e.id)}`,
        confidence: "high",
        method: "id"
      };
    if (e.hasAttribute("data-testid")) {
      const a = e.getAttribute("data-testid");
      return {
        selector: `[data-testid="${this.escapeAttribute(a)}"]`,
        confidence: "high",
        method: "data-testid"
      };
    }
    const n = this.getSemanticDataAttributes(e);
    if (n.length > 0) {
      const a = n[0], l = e.getAttribute(a);
      return {
        selector: `[${a}="${this.escapeAttribute(l)}"]`,
        confidence: "high",
        method: "data-attribute"
      };
    }
    const r = this.generateAriaSelector(e);
    if (r)
      return { selector: r, confidence: "medium", method: "aria" };
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
    const n = ["data-id", "data-name", "data-role", "data-component", "data-element"], r = [];
    for (const o of n)
      e.hasAttribute(o) && r.push(o);
    for (let o = 0; o < e.attributes.length; o++) {
      const a = e.attributes[o];
      a.name.startsWith("data-") && !r.includes(a.name) && r.push(a.name);
    }
    return r;
  }
  static generateAriaSelector(e) {
    const n = e.getAttribute("role"), r = e.getAttribute("aria-label");
    if (n) {
      let o = `[role="${this.escapeAttribute(n)}"]`;
      return r && (o += `[aria-label="${this.escapeAttribute(r)}"]`), o;
    }
    return null;
  }
  static generatePathSelector(e) {
    const n = [];
    let r = e;
    for (; r && r !== document.body && r !== document.documentElement; ) {
      let o = r.tagName.toLowerCase();
      if (r.id) {
        o += `#${this.escapeSelector(r.id)}`, n.unshift(o);
        break;
      }
      if (r.className && typeof r.className == "string") {
        const l = r.className.split(/\s+/).filter((d) => d && !d.startsWith("designer-")).slice(0, 2);
        l.length > 0 && (o += "." + l.map((d) => this.escapeSelector(d)).join("."));
      }
      const a = r.parentElement;
      if (a) {
        const l = Array.from(a.children).filter(
          (d) => d.tagName === r.tagName
        );
        l.length > 1 && (o += `:nth-of-type(${l.indexOf(r) + 1})`);
      }
      if (n.unshift(o), r = a, n.length >= 5) break;
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
function ut(t) {
  const e = t.getBoundingClientRect(), n = {};
  for (let r = 0; r < t.attributes.length; r++) {
    const o = t.attributes[r];
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
function Ee(t) {
  const e = window.getComputedStyle(t);
  return e.display !== "none" && e.visibility !== "hidden" && e.opacity !== "0" && t.getBoundingClientRect().height > 0 && t.getBoundingClientRect().width > 0;
}
function oe() {
  return window.location.pathname || "/";
}
function ke() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function gt(t) {
  const e = t.getBoundingClientRect();
  return e.top >= 0 && e.left >= 0 && e.bottom <= (window.innerHeight || document.documentElement.clientHeight) && e.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function mt(t) {
  gt(t) || t.scrollIntoView({ behavior: "smooth", block: "center" });
}
const Ce = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class ft {
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
      if (n.closest(Ce)) {
        this.hideHighlight();
        return;
      }
      if (!Ee(n)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(n);
    }
  };
  handleClick = (e) => {
    if (!this.isActive) return;
    const n = e.target;
    n && (n.closest(Ce) || (e.preventDefault(), e.stopPropagation(), e.stopImmediatePropagation(), Ee(n) && this.selectElement(n)));
  };
  handleKeyDown = (e) => {
    this.isActive && e.key === "Escape" && (this.messageCallback?.({ type: "CANCEL" }), this.hideHighlight());
  };
  highlightElement(e) {
    if (!this.highlightOverlay) return;
    const n = e.getBoundingClientRect(), r = window.pageXOffset || document.documentElement.scrollLeft, o = window.pageYOffset || document.documentElement.scrollTop;
    this.highlightOverlay.style.display = "block", this.highlightOverlay.style.left = `${n.left + r}px`, this.highlightOverlay.style.top = `${n.top + o}px`, this.highlightOverlay.style.width = `${n.width}px`, this.highlightOverlay.style.height = `${n.height}px`;
  }
  hideHighlight() {
    this.highlightOverlay && (this.highlightOverlay.style.display = "none");
  }
  selectElement(e) {
    this.highlightElement(e);
    const n = pe.generateSelector(e), r = ut(e);
    this.messageCallback?.({
      type: "ELEMENT_SELECTED",
      selector: n.selector,
      elementInfo: r
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
var le, S, Ue, V, Te, Ve, je, Ye, ye, ue, ge, q = {}, Ke = [], pt = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, de = Array.isArray;
function F(t, e) {
  for (var n in e) t[n] = e[n];
  return t;
}
function _e(t) {
  t && t.parentNode && t.parentNode.removeChild(t);
}
function yt(t, e, n) {
  var r, o, a, l = {};
  for (a in e) a == "key" ? r = e[a] : a == "ref" ? o = e[a] : l[a] = e[a];
  if (arguments.length > 2 && (l.children = arguments.length > 3 ? le.call(arguments, 2) : n), typeof t == "function" && t.defaultProps != null) for (a in t.defaultProps) l[a] === void 0 && (l[a] = t.defaultProps[a]);
  return ne(t, l, r, o, null);
}
function ne(t, e, n, r, o) {
  var a = { type: t, props: e, key: n, ref: r, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: o ?? ++Ue, __i: -1, __u: 0 };
  return o == null && S.vnode != null && S.vnode(a), a;
}
function X(t) {
  return t.children;
}
function ie(t, e) {
  this.props = t, this.context = e;
}
function K(t, e) {
  if (e == null) return t.__ ? K(t.__, t.__i + 1) : null;
  for (var n; e < t.__k.length; e++) if ((n = t.__k[e]) != null && n.__e != null) return n.__e;
  return typeof t.type == "function" ? K(t) : null;
}
function Xe(t) {
  var e, n;
  if ((t = t.__) != null && t.__c != null) {
    for (t.__e = t.__c.base = null, e = 0; e < t.__k.length; e++) if ((n = t.__k[e]) != null && n.__e != null) {
      t.__e = t.__c.base = n.__e;
      break;
    }
    return Xe(t);
  }
}
function Ie(t) {
  (!t.__d && (t.__d = !0) && V.push(t) && !ae.__r++ || Te != S.debounceRendering) && ((Te = S.debounceRendering) || Ve)(ae);
}
function ae() {
  for (var t, e, n, r, o, a, l, d = 1; V.length; ) V.length > d && V.sort(je), t = V.shift(), d = V.length, t.__d && (n = void 0, r = void 0, o = (r = (e = t).__v).__e, a = [], l = [], e.__P && ((n = F({}, r)).__v = r.__v + 1, S.vnode && S.vnode(n), be(e.__P, n, r, e.__n, e.__P.namespaceURI, 32 & r.__u ? [o] : null, a, o ?? K(r), !!(32 & r.__u), l), n.__v = r.__v, n.__.__k[n.__i] = n, Qe(a, n, l), r.__e = r.__ = null, n.__e != o && Xe(n)));
  ae.__r = 0;
}
function Je(t, e, n, r, o, a, l, d, u, c, g) {
  var s, p, f, x, C, w, m, b = r && r.__k || Ke, D = e.length;
  for (u = _t(n, e, b, u, D), s = 0; s < D; s++) (f = n.__k[s]) != null && (p = f.__i == -1 ? q : b[f.__i] || q, f.__i = s, w = be(t, f, p, o, a, l, d, u, c, g), x = f.__e, f.ref && p.ref != f.ref && (p.ref && ve(p.ref, null, f), g.push(f.ref, f.__c || x, f)), C == null && x != null && (C = x), (m = !!(4 & f.__u)) || p.__k === f.__k ? u = qe(f, u, t, m) : typeof f.type == "function" && w !== void 0 ? u = w : x && (u = x.nextSibling), f.__u &= -7);
  return n.__e = C, u;
}
function _t(t, e, n, r, o) {
  var a, l, d, u, c, g = n.length, s = g, p = 0;
  for (t.__k = new Array(o), a = 0; a < o; a++) (l = e[a]) != null && typeof l != "boolean" && typeof l != "function" ? (typeof l == "string" || typeof l == "number" || typeof l == "bigint" || l.constructor == String ? l = t.__k[a] = ne(null, l, null, null, null) : de(l) ? l = t.__k[a] = ne(X, { children: l }, null, null, null) : l.constructor === void 0 && l.__b > 0 ? l = t.__k[a] = ne(l.type, l.props, l.key, l.ref ? l.ref : null, l.__v) : t.__k[a] = l, u = a + p, l.__ = t, l.__b = t.__b + 1, d = null, (c = l.__i = bt(l, n, u, s)) != -1 && (s--, (d = n[c]) && (d.__u |= 2)), d == null || d.__v == null ? (c == -1 && (o > g ? p-- : o < g && p++), typeof l.type != "function" && (l.__u |= 4)) : c != u && (c == u - 1 ? p-- : c == u + 1 ? p++ : (c > u ? p-- : p++, l.__u |= 4))) : t.__k[a] = null;
  if (s) for (a = 0; a < g; a++) (d = n[a]) != null && (2 & d.__u) == 0 && (d.__e == r && (r = K(d)), et(d, d));
  return r;
}
function qe(t, e, n, r) {
  var o, a;
  if (typeof t.type == "function") {
    for (o = t.__k, a = 0; o && a < o.length; a++) o[a] && (o[a].__ = t, e = qe(o[a], e, n, r));
    return e;
  }
  t.__e != e && (r && (e && t.type && !e.parentNode && (e = K(t)), n.insertBefore(t.__e, e || null)), e = t.__e);
  do
    e = e && e.nextSibling;
  while (e != null && e.nodeType == 8);
  return e;
}
function bt(t, e, n, r) {
  var o, a, l, d = t.key, u = t.type, c = e[n], g = c != null && (2 & c.__u) == 0;
  if (c === null && d == null || g && d == c.key && u == c.type) return n;
  if (r > (g ? 1 : 0)) {
    for (o = n - 1, a = n + 1; o >= 0 || a < e.length; ) if ((c = e[l = o >= 0 ? o-- : a++]) != null && (2 & c.__u) == 0 && d == c.key && u == c.type) return l;
  }
  return -1;
}
function De(t, e, n) {
  e[0] == "-" ? t.setProperty(e, n ?? "") : t[e] = n == null ? "" : typeof n != "number" || pt.test(e) ? n : n + "px";
}
function ee(t, e, n, r, o) {
  var a, l;
  e: if (e == "style") if (typeof n == "string") t.style.cssText = n;
  else {
    if (typeof r == "string" && (t.style.cssText = r = ""), r) for (e in r) n && e in n || De(t.style, e, "");
    if (n) for (e in n) r && n[e] == r[e] || De(t.style, e, n[e]);
  }
  else if (e[0] == "o" && e[1] == "n") a = e != (e = e.replace(Ye, "$1")), l = e.toLowerCase(), e = l in t || e == "onFocusOut" || e == "onFocusIn" ? l.slice(2) : e.slice(2), t.l || (t.l = {}), t.l[e + a] = n, n ? r ? n.u = r.u : (n.u = ye, t.addEventListener(e, a ? ge : ue, a)) : t.removeEventListener(e, a ? ge : ue, a);
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
function Ae(t) {
  return function(e) {
    if (this.l) {
      var n = this.l[e.type + t];
      if (e.t == null) e.t = ye++;
      else if (e.t < n.u) return;
      return n(S.event ? S.event(e) : e);
    }
  };
}
function be(t, e, n, r, o, a, l, d, u, c) {
  var g, s, p, f, x, C, w, m, b, D, A, B, M, G, y, L, P, R = e.type;
  if (e.constructor !== void 0) return null;
  128 & n.__u && (u = !!(32 & n.__u), a = [d = e.__e = n.__e]), (g = S.__b) && g(e);
  e: if (typeof R == "function") try {
    if (m = e.props, b = "prototype" in R && R.prototype.render, D = (g = R.contextType) && r[g.__c], A = g ? D ? D.props.value : g.__ : r, n.__c ? w = (s = e.__c = n.__c).__ = s.__E : (b ? e.__c = s = new R(m, A) : (e.__c = s = new ie(m, A), s.constructor = R, s.render = wt), D && D.sub(s), s.state || (s.state = {}), s.__n = r, p = s.__d = !0, s.__h = [], s._sb = []), b && s.__s == null && (s.__s = s.state), b && R.getDerivedStateFromProps != null && (s.__s == s.state && (s.__s = F({}, s.__s)), F(s.__s, R.getDerivedStateFromProps(m, s.__s))), f = s.props, x = s.state, s.__v = e, p) b && R.getDerivedStateFromProps == null && s.componentWillMount != null && s.componentWillMount(), b && s.componentDidMount != null && s.__h.push(s.componentDidMount);
    else {
      if (b && R.getDerivedStateFromProps == null && m !== f && s.componentWillReceiveProps != null && s.componentWillReceiveProps(m, A), e.__v == n.__v || !s.__e && s.shouldComponentUpdate != null && s.shouldComponentUpdate(m, s.__s, A) === !1) {
        for (e.__v != n.__v && (s.props = m, s.state = s.__s, s.__d = !1), e.__e = n.__e, e.__k = n.__k, e.__k.some(function($) {
          $ && ($.__ = e);
        }), B = 0; B < s._sb.length; B++) s.__h.push(s._sb[B]);
        s._sb = [], s.__h.length && l.push(s);
        break e;
      }
      s.componentWillUpdate != null && s.componentWillUpdate(m, s.__s, A), b && s.componentDidUpdate != null && s.__h.push(function() {
        s.componentDidUpdate(f, x, C);
      });
    }
    if (s.context = A, s.props = m, s.__P = t, s.__e = !1, M = S.__r, G = 0, b) {
      for (s.state = s.__s, s.__d = !1, M && M(e), g = s.render(s.props, s.state, s.context), y = 0; y < s._sb.length; y++) s.__h.push(s._sb[y]);
      s._sb = [];
    } else do
      s.__d = !1, M && M(e), g = s.render(s.props, s.state, s.context), s.state = s.__s;
    while (s.__d && ++G < 25);
    s.state = s.__s, s.getChildContext != null && (r = F(F({}, r), s.getChildContext())), b && !p && s.getSnapshotBeforeUpdate != null && (C = s.getSnapshotBeforeUpdate(f, x)), L = g, g != null && g.type === X && g.key == null && (L = Ze(g.props.children)), d = Je(t, de(L) ? L : [L], e, n, r, o, a, l, d, u, c), s.base = e.__e, e.__u &= -161, s.__h.length && l.push(s), w && (s.__E = s.__ = null);
  } catch ($) {
    if (e.__v = null, u || a != null) if ($.then) {
      for (e.__u |= u ? 160 : 128; d && d.nodeType == 8 && d.nextSibling; ) d = d.nextSibling;
      a[a.indexOf(d)] = null, e.__e = d;
    } else {
      for (P = a.length; P--; ) _e(a[P]);
      me(e);
    }
    else e.__e = n.__e, e.__k = n.__k, $.then || me(e);
    S.__e($, e, n);
  }
  else a == null && e.__v == n.__v ? (e.__k = n.__k, e.__e = n.__e) : d = e.__e = vt(n.__e, e, n, r, o, a, l, u, c);
  return (g = S.diffed) && g(e), 128 & e.__u ? void 0 : d;
}
function me(t) {
  t && t.__c && (t.__c.__e = !0), t && t.__k && t.__k.forEach(me);
}
function Qe(t, e, n) {
  for (var r = 0; r < n.length; r++) ve(n[r], n[++r], n[++r]);
  S.__c && S.__c(e, t), t.some(function(o) {
    try {
      t = o.__h, o.__h = [], t.some(function(a) {
        a.call(o);
      });
    } catch (a) {
      S.__e(a, o.__v);
    }
  });
}
function Ze(t) {
  return typeof t != "object" || t == null || t.__b && t.__b > 0 ? t : de(t) ? t.map(Ze) : F({}, t);
}
function vt(t, e, n, r, o, a, l, d, u) {
  var c, g, s, p, f, x, C, w = n.props || q, m = e.props, b = e.type;
  if (b == "svg" ? o = "http://www.w3.org/2000/svg" : b == "math" ? o = "http://www.w3.org/1998/Math/MathML" : o || (o = "http://www.w3.org/1999/xhtml"), a != null) {
    for (c = 0; c < a.length; c++) if ((f = a[c]) && "setAttribute" in f == !!b && (b ? f.localName == b : f.nodeType == 3)) {
      t = f, a[c] = null;
      break;
    }
  }
  if (t == null) {
    if (b == null) return document.createTextNode(m);
    t = document.createElementNS(o, b, m.is && m), d && (S.__m && S.__m(e, a), d = !1), a = null;
  }
  if (b == null) w === m || d && t.data == m || (t.data = m);
  else {
    if (a = a && le.call(t.childNodes), !d && a != null) for (w = {}, c = 0; c < t.attributes.length; c++) w[(f = t.attributes[c]).name] = f.value;
    for (c in w) if (f = w[c], c != "children") {
      if (c == "dangerouslySetInnerHTML") s = f;
      else if (!(c in m)) {
        if (c == "value" && "defaultValue" in m || c == "checked" && "defaultChecked" in m) continue;
        ee(t, c, null, f, o);
      }
    }
    for (c in m) f = m[c], c == "children" ? p = f : c == "dangerouslySetInnerHTML" ? g = f : c == "value" ? x = f : c == "checked" ? C = f : d && typeof f != "function" || w[c] === f || ee(t, c, f, w[c], o);
    if (g) d || s && (g.__html == s.__html || g.__html == t.innerHTML) || (t.innerHTML = g.__html), e.__k = [];
    else if (s && (t.innerHTML = ""), Je(e.type == "template" ? t.content : t, de(p) ? p : [p], e, n, r, b == "foreignObject" ? "http://www.w3.org/1999/xhtml" : o, a, l, a ? a[0] : n.__k && K(n, 0), d, u), a != null) for (c = a.length; c--; ) _e(a[c]);
    d || (c = "value", b == "progress" && x == null ? t.removeAttribute("value") : x != null && (x !== t[c] || b == "progress" && !x || b == "option" && x != w[c]) && ee(t, c, x, w[c], o), c = "checked", C != null && C != t[c] && ee(t, c, C, w[c], o));
  }
  return t;
}
function ve(t, e, n) {
  try {
    if (typeof t == "function") {
      var r = typeof t.__u == "function";
      r && t.__u(), r && e == null || (t.__u = t(e));
    } else t.current = e;
  } catch (o) {
    S.__e(o, n);
  }
}
function et(t, e, n) {
  var r, o;
  if (S.unmount && S.unmount(t), (r = t.ref) && (r.current && r.current != t.__e || ve(r, null, e)), (r = t.__c) != null) {
    if (r.componentWillUnmount) try {
      r.componentWillUnmount();
    } catch (a) {
      S.__e(a, e);
    }
    r.base = r.__P = null;
  }
  if (r = t.__k) for (o = 0; o < r.length; o++) r[o] && et(r[o], e, n || typeof t.type != "function");
  n || _e(t.__e), t.__c = t.__ = t.__e = void 0;
}
function wt(t, e, n) {
  return this.constructor(t, n);
}
function O(t, e, n) {
  var r, o, a, l;
  e == document && (e = document.documentElement), S.__ && S.__(t, e), o = (r = !1) ? null : e.__k, a = [], l = [], be(e, t = e.__k = yt(X, null, [t]), o || q, q, e.namespaceURI, o ? null : e.firstChild ? le.call(e.childNodes) : null, a, o ? o.__e : e.firstChild, r, l), Qe(a, t, l);
}
le = Ke.slice, S = { __e: function(t, e, n, r) {
  for (var o, a, l; e = e.__; ) if ((o = e.__c) && !o.__) try {
    if ((a = o.constructor) && a.getDerivedStateFromError != null && (o.setState(a.getDerivedStateFromError(t)), l = o.__d), o.componentDidCatch != null && (o.componentDidCatch(t, r || {}), l = o.__d), l) return o.__E = o;
  } catch (d) {
    t = d;
  }
  throw t;
} }, Ue = 0, ie.prototype.setState = function(t, e) {
  var n;
  n = this.__s != null && this.__s != this.state ? this.__s : this.__s = F({}, this.state), typeof t == "function" && (t = t(F({}, n), this.props)), t && F(n, t), t != null && this.__v && (e && this._sb.push(e), Ie(this));
}, ie.prototype.forceUpdate = function(t) {
  this.__v && (this.__e = !0, t && this.__h.push(t), Ie(this));
}, ie.prototype.render = X, V = [], Ve = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, je = function(t, e) {
  return t.__v.__b - e.__v.__b;
}, ae.__r = 0, Ye = /(PointerCapture)$|Capture$/i, ye = 0, ue = Ae(!1), ge = Ae(!0);
var St = 0;
function i(t, e, n, r, o, a) {
  e || (e = {});
  var l, d, u = e;
  if ("ref" in u) for (d in u = {}, e) d == "ref" ? l = e[d] : u[d] = e[d];
  var c = { type: t, props: u, key: n, ref: l, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --St, __i: -1, __u: 0, __source: o, __self: a };
  if (typeof t == "function" && (l = t.defaultProps)) for (d in l) u[d] === void 0 && (u[d] = l[d]);
  return S.vnode && S.vnode(c), c;
}
const _ = {
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
function xt({ guide: t, top: e, left: n, arrowStyle: r, onDismiss: o }) {
  return /* @__PURE__ */ i(
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
        left: `${n}px`,
        pointerEvents: "auto"
      },
      children: [
        /* @__PURE__ */ i("div", { style: { marginBottom: 8 }, children: t.content }),
        /* @__PURE__ */ i(
          "button",
          {
            type: "button",
            onClick: o,
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
        /* @__PURE__ */ i(
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
function Et(t) {
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
function kt(t, e, n, r) {
  const o = t.getBoundingClientRect(), a = window.pageXOffset || document.documentElement.scrollLeft, l = window.pageYOffset || document.documentElement.scrollTop, d = window.innerWidth, u = window.innerHeight;
  let c = 0, g = 0;
  switch (e) {
    case "top":
      c = o.top + l - r - 12, g = o.left + a + o.width / 2 - n / 2;
      break;
    case "bottom":
      c = o.bottom + l + 12, g = o.left + a + o.width / 2 - n / 2;
      break;
    case "left":
      c = o.top + l + o.height / 2 - r / 2, g = o.left + a - n - 12;
      break;
    default:
      c = o.top + l + o.height / 2 - r / 2, g = o.right + a + 12;
      break;
  }
  return g < a ? g = a + 10 : g + n > a + d && (g = a + d - n - 10), c < l ? c = l + 10 : c + r > l + u && (c = l + u - r - 10), { top: c, left: g, arrowStyle: Et(e) };
}
class Ct {
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
    const n = oe(), r = e.filter(
      (a) => a.page === n && a.status === "active" && !this.dismissedThisSession.has(a.id)
    );
    if (r.length === 0 || (this.ensureContainer(), !this.container)) return;
    const o = [];
    for (const a of r) {
      const l = pe.findElement(a.selector);
      if (!l) continue;
      mt(l);
      const d = kt(l, a.placement, 280, 80);
      o.push({ guide: a, target: l, pos: d });
    }
    O(
      /* @__PURE__ */ i(
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
            zIndex: _.zIndex.guides
          },
          children: o.map(({ guide: a, pos: l }) => /* @__PURE__ */ i(
            xt,
            {
              guide: a,
              top: l.top,
              left: l.left,
              arrowStyle: l.arrowStyle,
              onDismiss: () => this.dismissGuide(a.id)
            },
            a.id
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
    this.dismissedThisSession.clear(), this.container && O(null, this.container);
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
const Le = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function Tt({ feature: t, color: e, rect: n }) {
  const r = window.pageXOffset || document.documentElement.scrollLeft, o = window.pageYOffset || document.documentElement.scrollTop;
  return /* @__PURE__ */ i(
    "div",
    {
      className: "designer-feature-heatmap-overlay",
      title: t.featureName,
      style: {
        position: "absolute",
        left: n.left + r,
        top: n.top + o,
        width: n.width,
        height: n.height,
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
function Re(t) {
  return (t || "").replace(/^https?:\/\//i, "").replace(/\/$/, "").trim() || "";
}
function It() {
  try {
    return window.location.href || "";
  } catch {
    return "";
  }
}
class Dt {
  container = null;
  lastEnabled = !1;
  render(e, n) {
    if (this.lastEnabled = n, this.clear(), !n || e.length === 0) return;
    const r = It(), o = Re(r), a = e.filter((d) => d.url && Re(d.url) === o);
    if (a.length === 0 || (this.ensureContainer(), !this.container)) return;
    const l = a.map((d, u) => {
      const c = pe.findElement(d.selector);
      if (!c) return null;
      const g = c.getBoundingClientRect(), s = Le[u % Le.length];
      return { feature: d, rect: g, color: s };
    }).filter(Boolean);
    O(
      /* @__PURE__ */ i(
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
            zIndex: _.zIndex.overlay - 1
          },
          children: l.map(({ feature: d, rect: u, color: c }) => /* @__PURE__ */ i(
            Tt,
            {
              feature: d,
              color: c,
              rect: {
                left: u.left,
                top: u.top,
                width: u.width,
                height: u.height
              }
            },
            d.id
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
    this.container && O(null, this.container);
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
var Q, k, ce, Be, se = 0, tt = [], T = S, ze = T.__b, He = T.__r, Me = T.diffed, Pe = T.__c, Fe = T.unmount, $e = T.__;
function we(t, e) {
  T.__h && T.__h(k, t, se || e), se = 0;
  var n = k.__H || (k.__H = { __: [], __h: [] });
  return t >= n.__.length && n.__.push({}), n.__[t];
}
function E(t) {
  return se = 1, At(it, t);
}
function At(t, e, n) {
  var r = we(Q++, 2);
  if (r.t = t, !r.__c && (r.__ = [it(void 0, e), function(d) {
    var u = r.__N ? r.__N[0] : r.__[0], c = r.t(u, d);
    u !== c && (r.__N = [c, r.__[1]], r.__c.setState({}));
  }], r.__c = k, !k.__f)) {
    var o = function(d, u, c) {
      if (!r.__c.__H) return !0;
      var g = r.__c.__H.__.filter(function(p) {
        return !!p.__c;
      });
      if (g.every(function(p) {
        return !p.__N;
      })) return !a || a.call(this, d, u, c);
      var s = r.__c.props !== d;
      return g.forEach(function(p) {
        if (p.__N) {
          var f = p.__[0];
          p.__ = p.__N, p.__N = void 0, f !== p.__[0] && (s = !0);
        }
      }), a && a.call(this, d, u, c) || s;
    };
    k.__f = !0;
    var a = k.shouldComponentUpdate, l = k.componentWillUpdate;
    k.componentWillUpdate = function(d, u, c) {
      if (this.__e) {
        var g = a;
        a = void 0, o(d, u, c), a = g;
      }
      l && l.call(this, d, u, c);
    }, k.shouldComponentUpdate = o;
  }
  return r.__N || r.__;
}
function H(t, e) {
  var n = we(Q++, 3);
  !T.__s && nt(n.__H, e) && (n.__ = t, n.u = e, k.__H.__h.push(n));
}
function Lt(t, e) {
  var n = we(Q++, 7);
  return nt(n.__H, e) && (n.__ = t(), n.__H = e, n.__h = t), n.__;
}
function J(t, e) {
  return se = 8, Lt(function() {
    return t;
  }, e);
}
function Rt() {
  for (var t; t = tt.shift(); ) if (t.__P && t.__H) try {
    t.__H.__h.forEach(re), t.__H.__h.forEach(fe), t.__H.__h = [];
  } catch (e) {
    t.__H.__h = [], T.__e(e, t.__v);
  }
}
T.__b = function(t) {
  k = null, ze && ze(t);
}, T.__ = function(t, e) {
  t && e.__k && e.__k.__m && (t.__m = e.__k.__m), $e && $e(t, e);
}, T.__r = function(t) {
  He && He(t), Q = 0;
  var e = (k = t.__c).__H;
  e && (ce === k ? (e.__h = [], k.__h = [], e.__.forEach(function(n) {
    n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
  })) : (e.__h.forEach(re), e.__h.forEach(fe), e.__h = [], Q = 0)), ce = k;
}, T.diffed = function(t) {
  Me && Me(t);
  var e = t.__c;
  e && e.__H && (e.__H.__h.length && (tt.push(e) !== 1 && Be === T.requestAnimationFrame || ((Be = T.requestAnimationFrame) || Bt)(Rt)), e.__H.__.forEach(function(n) {
    n.u && (n.__H = n.u), n.u = void 0;
  })), ce = k = null;
}, T.__c = function(t, e) {
  e.some(function(n) {
    try {
      n.__h.forEach(re), n.__h = n.__h.filter(function(r) {
        return !r.__ || fe(r);
      });
    } catch (r) {
      e.some(function(o) {
        o.__h && (o.__h = []);
      }), e = [], T.__e(r, n.__v);
    }
  }), Pe && Pe(t, e);
}, T.unmount = function(t) {
  Fe && Fe(t);
  var e, n = t.__c;
  n && n.__H && (n.__H.__.forEach(function(r) {
    try {
      re(r);
    } catch (o) {
      e = o;
    }
  }), n.__H = void 0, e && T.__e(e, n.__v));
};
var Oe = typeof requestAnimationFrame == "function";
function Bt(t) {
  var e, n = function() {
    clearTimeout(r), Oe && cancelAnimationFrame(e), setTimeout(t);
  }, r = setTimeout(n, 35);
  Oe && (e = requestAnimationFrame(n));
}
function re(t) {
  var e = k, n = t.__c;
  typeof n == "function" && (t.__c = void 0, n()), k = e;
}
function fe(t) {
  var e = k;
  t.__c = t.__(), k = e;
}
function nt(t, e) {
  return !t || t.length !== e.length || e.some(function(n, r) {
    return n !== t[r];
  });
}
function it(t, e) {
  return typeof e == "function" ? e(t) : e;
}
const h = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "100%",
    minHeight: "100%"
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
    letterSpacing: "-0.025em"
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
    boxShadow: "0 4px 6px -1px rgba(59,130,246,0.3)",
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
    color: "#475569"
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
    fontFamily: "inherit"
  },
  input: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    color: "#0f172a",
    background: "#fff",
    fontFamily: "inherit"
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
    ...t ? { background: "#3b82f6", color: "#fff", border: "none", boxShadow: "0 4px 6px -1px rgba(59,130,246,0.3)" } : { background: "#fff", color: "#475569", border: "1px solid #e2e8f0" }
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
    boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)",
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
    fontFamily: "inherit",
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
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
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
    fontFamily: "inherit"
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
    fontFamily: "inherit"
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
}, zt = `
iconify-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; }
`, Ht = ["top", "right", "bottom", "left"];
function Mt({ onMessage: t, elementSelected: e }) {
  const [n, r] = E(""), [o, a] = E(null), [l, d] = E(""), [u, c] = E("right"), [g, s] = E(""), [p, f] = E(!1);
  H(() => {
    t({ type: "EDITOR_READY" });
  }, []), H(() => {
    e ? (r(e.selector), a(e.elementInfo), f(!0), d(""), s("")) : (r(""), a(null), f(!1), d(""), s(""));
  }, [e]);
  const x = () => {
    const m = l.trim();
    if (!m) {
      s("Please enter guide content");
      return;
    }
    if (!n) {
      s("No element selected");
      return;
    }
    s(""), t({
      type: "SAVE_GUIDE",
      guide: {
        page: oe(),
        selector: n,
        content: m,
        placement: u,
        status: "active"
      }
    });
  }, C = () => {
    r(""), a(null), f(!1), d(""), s(""), t({ type: "CLEAR_SELECTION_CLICKED" });
  }, w = (m) => {
    const b = [];
    return m.tagName && b.push(`Tag: ${m.tagName}`), m.id && b.push(`ID: ${m.id}`), m.className && b.push(`Class: ${m.className}`), m.textContent && b.push(`Text: ${m.textContent}`), b.join(" | ");
  };
  return /* @__PURE__ */ i("div", { style: h.root, children: [
    /* @__PURE__ */ i("div", { style: h.header, children: [
      /* @__PURE__ */ i("h2", { style: h.headerTitle, children: "Create Guide" }),
      /* @__PURE__ */ i(
        "button",
        {
          type: "button",
          style: h.closeBtn,
          onClick: () => t({ type: "CANCEL" }),
          "aria-label": "Close",
          children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:close", style: { fontSize: "1.25rem" } })
        }
      )
    ] }),
    p ? /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
      /* @__PURE__ */ i("div", { style: h.section, children: [
        /* @__PURE__ */ i("label", { style: h.label, children: "Selector" }),
        /* @__PURE__ */ i("div", { style: h.selectorBox, children: n || "-" })
      ] }),
      o && /* @__PURE__ */ i("div", { style: h.elementInfo, children: [
        /* @__PURE__ */ i("strong", { style: h.elementInfoTitle, children: "Element Info" }),
        /* @__PURE__ */ i("div", { style: h.elementInfoText, children: w(o) })
      ] }),
      /* @__PURE__ */ i("div", { style: h.section, children: [
        /* @__PURE__ */ i("label", { for: "guideContent", style: h.label, children: "Guide Content" }),
        /* @__PURE__ */ i(
          "textarea",
          {
            id: "guideContent",
            style: h.textarea,
            placeholder: "Enter the guide text that will be shown to users...",
            value: l,
            onInput: (m) => d(m.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ i("div", { style: h.section, children: [
        /* @__PURE__ */ i("label", { style: h.label, children: "Placement" }),
        /* @__PURE__ */ i("div", { style: h.placementGrid, children: Ht.map((m) => /* @__PURE__ */ i(
          "button",
          {
            type: "button",
            style: h.placementBtn(u === m),
            onClick: () => c(m),
            children: m.charAt(0).toUpperCase() + m.slice(1)
          },
          m
        )) })
      ] }),
      g && /* @__PURE__ */ i("div", { style: h.errorBox, children: [
        /* @__PURE__ */ i("iconify-icon", { icon: "mdi:alert-circle" }),
        g
      ] }),
      /* @__PURE__ */ i("div", { style: h.actionRow, children: [
        /* @__PURE__ */ i("button", { type: "button", style: h.secondaryBtn, onClick: () => t({ type: "CANCEL" }), children: "Cancel" }),
        /* @__PURE__ */ i("button", { type: "button", style: h.secondaryBtn, onClick: C, children: "Clear Selection" }),
        /* @__PURE__ */ i("button", { type: "button", style: { ...h.primaryBtn, flex: 1 }, onClick: x, children: "Save Guide" })
      ] })
    ] }) : /* @__PURE__ */ i("div", { style: h.emptyState, children: [
      /* @__PURE__ */ i("div", { style: h.emptyStateIcon, children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:cursor-default-click", style: { fontSize: "1.875rem", color: "#3b82f6" } }) }),
      /* @__PURE__ */ i("p", { style: h.emptyStateText, children: "Click on an element in the page to create a guide" }),
      /* @__PURE__ */ i("button", { type: "button", style: h.primaryBtn, onClick: () => t({ type: "ACTIVATE_SELECTOR" }), children: [
        /* @__PURE__ */ i("iconify-icon", { icon: "mdi:selection-marker" }),
        "Select element"
      ] })
    ] })
  ] });
}
const rt = "designerTaggedPages";
function j() {
  try {
    const t = window.location;
    return (t.host || t.hostname || "") + (t.pathname || "/") + (t.search || "") + (t.hash || "");
  } catch {
    return window.location.href || "";
  }
}
function Y(t) {
  return (t || "").replace(/^https?:\/\//i, "").replace(/\/$/, "") || "";
}
function he() {
  try {
    const t = localStorage.getItem(rt) || "[]";
    return JSON.parse(t);
  } catch {
    return [];
  }
}
function Pt() {
  try {
    const t = window.location, e = (t.pathname || "/").replace(/^\//, ""), n = t.search || "", r = t.hash || "";
    return "//*/" + e + n + r;
  } catch {
    return "//*/";
  }
}
function Ft({ onMessage: t, tagPageSavedAckCounter: e }) {
  const [n, r] = E("overviewUntagged"), [o, a] = E(""), [l, d] = E(""), [u, c] = E(!1), [g, s] = E("create"), [p, f] = E(""), [x, C] = E(""), [w, m] = E("suggested"), [b, D] = E(""), [A, B] = E(!1), M = J(() => {
    const v = Y(j());
    return he().some((W) => W && Y(W.url) === v);
  }, []), G = J(() => {
    const v = Y(j());
    return he().filter((z) => z && Y(z.url) === v);
  }, []), y = J(() => {
    const v = M();
    r(v ? "overviewTagged" : "overviewUntagged"), a(j() || "(current page)"), c(!1);
  }, [M]), L = J(() => {
    r("taggedPagesDetailView"), d("");
  }, []), P = J(() => {
    r("tagPageFormView"), c(!0), D(Pt()), f(""), C(""), s("create"), m("suggested"), B(!1);
  }, []);
  H(() => {
    t({ type: "EDITOR_READY" });
  }, []), H(() => {
    y();
  }, [y]), H(() => {
    e != null && e > 0 && y();
  }, [e, y]), H(() => {
    let v = j();
    const z = () => {
      const xe = j();
      xe !== v && (v = xe, y());
    }, W = () => z(), U = () => z();
    window.addEventListener("hashchange", W), window.addEventListener("popstate", U);
    const ht = setInterval(z, 1500);
    return () => {
      window.removeEventListener("hashchange", W), window.removeEventListener("popstate", U), clearInterval(ht);
    };
  }, [y]);
  const R = () => {
    const v = p.trim();
    if (!v) {
      B(!0);
      return;
    }
    B(!1);
    const z = {
      pageSetup: g,
      pageName: v,
      description: x.trim() || void 0,
      includeRules: [{ ruleType: w, selectionUrl: b.trim() || "" }]
    };
    t({ type: "SAVE_TAG_PAGE", payload: z });
  }, $ = (v) => {
    if (!window.confirm(`Delete page "${v}"?`)) return;
    const z = Y(j()), W = he().filter(
      (U) => !(U && U.pageName === v && Y(U.url) === z)
    );
    try {
      localStorage.setItem(rt, JSON.stringify(W)), G().length === 0 ? y() : n === "taggedPagesDetailView" && r("taggedPagesDetailView");
    } catch {
    }
  }, Se = G().filter(
    (v) => (v.pageName || "").toLowerCase().includes(l.toLowerCase().trim())
  ), Z = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return /* @__PURE__ */ i("div", { style: h.panel, children: [
    /* @__PURE__ */ i("div", { style: h.panelHeader, children: [
      /* @__PURE__ */ i("h2", { style: { ...h.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ i("div", { style: { display: "flex", gap: "0.25rem" }, children: [
        /* @__PURE__ */ i("button", { type: "button", style: h.iconBtn, title: "Menu", children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:dots-horizontal", style: { fontSize: "1.125rem" } }) }),
        /* @__PURE__ */ i("button", { type: "button", style: h.iconBtn, title: "Minimize", onClick: () => t({ type: "CANCEL" }), children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) })
      ] })
    ] }),
    /* @__PURE__ */ i("div", { style: h.panelBody, children: [
      n === "overviewTagged" && /* @__PURE__ */ i("div", { style: Z, children: [
        /* @__PURE__ */ i("div", { style: h.sectionLabel, children: "PAGES OVERVIEW" }),
        /* @__PURE__ */ i("div", { style: { ...h.card, marginBottom: "1rem", cursor: "pointer" }, onClick: L, children: /* @__PURE__ */ i("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ i("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ i("span", { style: { ...h.badge, background: "#10b981", color: "#fff" }, children: "Tagged" }),
            /* @__PURE__ */ i("div", { style: { minWidth: 0 }, children: [
              /* @__PURE__ */ i("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }, children: "Current URL" }),
              /* @__PURE__ */ i("div", { style: { fontSize: "0.875rem", color: "#64748b", marginTop: "0.125rem", wordBreak: "break-all" }, children: o })
            ] })
          ] }),
          /* @__PURE__ */ i("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ i("button", { type: "button", style: { ...h.primaryBtn, width: "100%" }, onClick: P, children: "Tag Page" })
      ] }),
      n === "taggedPagesDetailView" && /* @__PURE__ */ i("div", { style: Z, children: [
        /* @__PURE__ */ i(
          "a",
          {
            href: "#",
            style: h.link,
            onClick: (v) => {
              v.preventDefault(), y();
            },
            children: [
              /* @__PURE__ */ i("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ i("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ i("span", { style: { ...h.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: Se.length }),
          /* @__PURE__ */ i("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ i("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ i("div", { style: h.searchWrap, children: [
          /* @__PURE__ */ i("iconify-icon", { icon: "mdi:magnify", style: h.searchIcon }),
          /* @__PURE__ */ i(
            "input",
            {
              type: "text",
              placeholder: "Search Pages",
              value: l,
              onInput: (v) => d(v.target.value),
              style: h.searchInput
            }
          ),
          l && /* @__PURE__ */ i("button", { type: "button", style: { position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer" }, onClick: () => d(""), children: "Clear" })
        ] }),
        Se.map((v) => /* @__PURE__ */ i("div", { style: { ...h.pageItem, marginBottom: "0.5rem" }, children: [
          /* @__PURE__ */ i("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: v.pageName || "Unnamed" }),
          /* @__PURE__ */ i("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ i("button", { type: "button", style: h.iconBtnSm, title: "Edit", onClick: () => t({ type: "EDIT_TAG_PAGE", payload: { pageName: v.pageName } }), children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ i("button", { type: "button", style: h.iconBtnSm, title: "Delete", onClick: () => $(v.pageName), children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, v.pageName)),
        /* @__PURE__ */ i("button", { type: "button", style: { ...h.primaryBtn, width: "100%", marginTop: "1rem" }, onClick: P, children: "Tag Page" })
      ] }),
      n === "overviewUntagged" && /* @__PURE__ */ i("div", { style: { ...Z, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ i("div", { style: { ...h.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ i("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ i("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ i("button", { type: "button", style: { ...h.primaryBtn, width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: P, children: "Tag Page" })
      ] }),
      n === "tagPageFormView" && /* @__PURE__ */ i("div", { style: { ...Z, gap: "1.5rem" }, children: [
        /* @__PURE__ */ i(
          "a",
          {
            href: "#",
            style: h.link,
            onClick: (v) => {
              v.preventDefault(), y(), c(!1);
            },
            children: [
              /* @__PURE__ */ i("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back"
            ]
          }
        ),
        /* @__PURE__ */ i("div", { children: [
          /* @__PURE__ */ i("div", { style: h.sectionLabel, children: "PAGE SETUP" }),
          /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ i("label", { style: h.radioLabel, children: [
              /* @__PURE__ */ i("input", { type: "radio", name: "pageSetup", value: "create", checked: g === "create", onChange: () => s("create"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ i("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Create New Page" })
            ] }),
            /* @__PURE__ */ i("label", { style: h.radioLabel, children: [
              /* @__PURE__ */ i("input", { type: "radio", name: "pageSetup", value: "merge", checked: g === "merge", onChange: () => s("merge"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ i("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Merge with Existing" })
            ] })
          ] }),
          /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }, children: [
            /* @__PURE__ */ i("div", { children: [
              /* @__PURE__ */ i("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: [
                "Page Name ",
                /* @__PURE__ */ i("span", { style: { color: "#ef4444" }, children: "*" })
              ] }),
              /* @__PURE__ */ i(
                "input",
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: p,
                  onInput: (v) => f(v.target.value),
                  style: h.input
                }
              ),
              A && /* @__PURE__ */ i("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ i("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ i("div", { children: [
              /* @__PURE__ */ i("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ i(
                "textarea",
                {
                  placeholder: "Click to add description",
                  value: x,
                  onInput: (v) => C(v.target.value),
                  style: { ...h.textarea, minHeight: "5rem" }
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ i("div", { children: [
          /* @__PURE__ */ i("div", { style: { ...h.sectionLabel, display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            "INCLUDE PAGE RULES",
            /* @__PURE__ */ i("span", { style: { color: "#94a3b8" }, title: "Define how this page is identified", children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:information-outline" }) })
          ] }),
          /* @__PURE__ */ i("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }, children: [
            /* @__PURE__ */ i("span", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#334155" }, children: "Include Rule 1" }),
            /* @__PURE__ */ i("button", { type: "button", style: h.iconBtnSm, children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] }),
          /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }, children: [
            /* @__PURE__ */ i("label", { style: h.radioLabel, children: [
              /* @__PURE__ */ i("input", { type: "radio", name: "ruleType", value: "suggested", checked: w === "suggested", onChange: () => m("suggested"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ i("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Suggested Match" })
            ] }),
            /* @__PURE__ */ i("label", { style: h.radioLabel, children: [
              /* @__PURE__ */ i("input", { type: "radio", name: "ruleType", value: "exact", checked: w === "exact", onChange: () => m("exact"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ i("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Exact Match" })
            ] }),
            /* @__PURE__ */ i("label", { style: h.radioLabel, children: [
              /* @__PURE__ */ i("input", { type: "radio", name: "ruleType", value: "builder", checked: w === "builder", onChange: () => m("builder"), style: { accentColor: "#3b82f6" } }),
              /* @__PURE__ */ i("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Rule Builder" })
            ] })
          ] }),
          /* @__PURE__ */ i("div", { children: [
            /* @__PURE__ */ i("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Selection URL" }),
            /* @__PURE__ */ i("input", { type: "text", placeholder: "e.g. //*/path/to/page", value: b, onInput: (v) => D(v.target.value), style: h.input })
          ] })
        ] })
      ] })
    ] }),
    u && /* @__PURE__ */ i("div", { style: h.footer, children: [
      /* @__PURE__ */ i("button", { type: "button", style: h.secondaryBtn, onClick: y, children: "Cancel" }),
      /* @__PURE__ */ i("button", { type: "button", style: { ...h.primaryBtn, flex: 1 }, onClick: R, children: "Save" })
    ] })
  ] });
}
const $t = "designerTaggedFeatures", Ne = "designerHeatmapEnabled";
function Ot() {
  try {
    const t = window.location;
    return (t.host || t.hostname || "") + (t.pathname || "/") + (t.search || "") + (t.hash || "");
  } catch {
    return window.location.href || "";
  }
}
function Ge(t) {
  return (t || "").replace(/^https?:\/\//i, "").replace(/\/$/, "") || "";
}
function Nt() {
  try {
    const t = localStorage.getItem($t) || "[]";
    return JSON.parse(t);
  } catch {
    return [];
  }
}
function Gt() {
  const t = Ge(Ot());
  return Nt().filter((e) => e && Ge(e.url) === t);
}
function Wt({ onMessage: t, elementSelected: e, tagFeatureSavedAckCounter: n }) {
  const [r, o] = E(!1), [a, l] = E(""), [d, u] = E(null), [c, g] = E(""), [s, p] = E(!1), [f, x] = E(0), [C, w] = E(!1), [m, b] = E("features"), D = () => {
    x(Gt().length);
  }, A = () => {
    o(!1), l(""), u(null), g(""), p(!1), D();
  };
  H(() => {
    t({ type: "EDITOR_READY" });
  }, []), H(() => {
    D();
  }, []), H(() => {
    const y = localStorage.getItem(Ne) === "true";
    w(y);
  }, []), H(() => {
    e ? (l(e.selector), u(e.elementInfo), o(!0), g(""), p(!1)) : A();
  }, [e]), H(() => {
    n != null && n > 0 && A();
  }, [n]);
  const B = () => {
    const y = !C;
    w(y);
    try {
      localStorage.setItem(Ne, String(y));
    } catch {
    }
    t({ type: "HEATMAP_TOGGLE", enabled: y });
  }, M = () => {
    const y = c.trim();
    if (!y) {
      p(!0);
      return;
    }
    p(!1), t({
      type: "SAVE_TAG_FEATURE",
      payload: {
        featureName: y,
        selector: a,
        elementInfo: d || void 0
      }
    });
  }, G = (y) => {
    const L = [];
    y.tagName && L.push(`Tag: ${y.tagName}`), y.id && L.push(`ID: ${y.id}`), y.className && L.push(`Class: ${y.className}`);
    const P = (y.textContent || "").slice(0, 80);
    return P && L.push(`Text: ${P}`), L.join(" | ");
  };
  return /* @__PURE__ */ i("div", { style: h.panel, children: [
    /* @__PURE__ */ i("div", { style: h.panelHeader, children: [
      /* @__PURE__ */ i("h2", { style: { ...h.headerTitle, fontSize: "1.125rem" }, children: "Manage Pages, Features & AI" }),
      /* @__PURE__ */ i("div", { style: { display: "flex", gap: "0.25rem" }, children: [
        /* @__PURE__ */ i("button", { type: "button", style: h.iconBtn, title: "Menu", children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:dots-horizontal", style: { fontSize: "1.125rem" } }) }),
        /* @__PURE__ */ i("button", { type: "button", style: h.iconBtn, title: "Minimize", onClick: () => t({ type: "CANCEL" }), children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) })
      ] })
    ] }),
    /* @__PURE__ */ i("div", { style: { display: "flex", gap: 0, borderBottom: "1px solid rgba(226,232,240,0.8)", padding: "0 1.5rem", background: "#fff" }, children: ["features", "pages", "ai-agents"].map((y) => /* @__PURE__ */ i(
      "button",
      {
        type: "button",
        style: h.tab(m === y),
        onClick: () => b(y),
        children: y.charAt(0).toUpperCase() + y.slice(1).replace("-", " ")
      },
      y
    )) }),
    /* @__PURE__ */ i("div", { style: { flex: 1, overflowY: "auto", padding: "1.5rem", background: "linear-gradient(to bottom, rgba(248,250,252,0.8), #fff)" }, children: r ? /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
      /* @__PURE__ */ i("div", { style: { padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
        /* @__PURE__ */ i("a", { href: "#", style: h.link, onClick: (y) => {
          y.preventDefault(), A();
        }, children: [
          /* @__PURE__ */ i("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back to overview"
        ] }),
        /* @__PURE__ */ i("h3", { style: { fontSize: "1.125rem", fontWeight: 700, color: "#1e293b" }, children: "Tag Feature" }),
        /* @__PURE__ */ i("div", { style: h.section, children: [
          /* @__PURE__ */ i("label", { style: h.label, children: "Selector" }),
          /* @__PURE__ */ i("div", { style: h.selectorBox, children: a || "-" })
        ] }),
        d && /* @__PURE__ */ i("div", { style: h.section, children: [
          /* @__PURE__ */ i("label", { style: h.label, children: "Element info" }),
          /* @__PURE__ */ i("div", { style: h.elementInfo, children: /* @__PURE__ */ i("div", { style: h.elementInfoText, children: G(d) }) })
        ] }),
        /* @__PURE__ */ i("div", { style: h.section, children: [
          /* @__PURE__ */ i("label", { style: h.label, children: [
            "Feature Name ",
            /* @__PURE__ */ i("span", { style: { color: "#ef4444" }, children: "*" })
          ] }),
          /* @__PURE__ */ i(
            "input",
            {
              type: "text",
              placeholder: "Enter feature name",
              value: c,
              onInput: (y) => g(y.target.value),
              style: h.input
            }
          ),
          s && /* @__PURE__ */ i("p", { style: { fontSize: "0.875rem", color: "#dc2626", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            /* @__PURE__ */ i("iconify-icon", { icon: "mdi:alert-circle" }),
            " Please enter a feature name."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ i("div", { style: h.footer, children: [
        /* @__PURE__ */ i("button", { type: "button", style: h.secondaryBtn, onClick: A, children: "Cancel" }),
        /* @__PURE__ */ i("button", { type: "button", style: h.secondaryBtn, onClick: () => t({ type: "CLEAR_SELECTION_CLICKED" }), children: "Clear Selection" }),
        /* @__PURE__ */ i("button", { type: "button", style: h.primaryBtn, onClick: M, children: "Save" })
      ] })
    ] }) : /* @__PURE__ */ i(X, { children: [
      m === "features" && /* @__PURE__ */ i("div", { style: { display: "flex", flexDirection: "column", gap: "1rem" }, children: [
        /* @__PURE__ */ i("div", { style: h.sectionLabel, children: "FEATURES OVERVIEW" }),
        /* @__PURE__ */ i("div", { style: { ...h.card, marginBottom: "0.75rem" }, children: /* @__PURE__ */ i("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ i("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ i("span", { style: { ...h.badge, background: "#14b8a6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: "0" }),
            /* @__PURE__ */ i("div", { style: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ i("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Suggested Features" }),
              /* @__PURE__ */ i("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of untagged elements on this page" })
            ] })
          ] }),
          /* @__PURE__ */ i("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ i("div", { style: { ...h.card, marginBottom: "0.75rem" }, children: /* @__PURE__ */ i("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ i("div", { style: { display: "flex", gap: "1rem", flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ i("span", { style: { ...h.badge, background: "#3b82f6", color: "#fff", minWidth: "1.75rem", height: "1.75rem" }, children: f }),
            /* @__PURE__ */ i("div", { style: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ i("div", { style: { fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.125rem" }, children: "Tagged Features" }),
              /* @__PURE__ */ i("div", { style: { fontSize: "0.75rem", color: "#64748b", lineHeight: 1.375 }, children: "List of tagged Features on this page" })
            ] })
          ] }),
          /* @__PURE__ */ i("iconify-icon", { icon: "mdi:chevron-right", style: { color: "#94a3b8", fontSize: "1.25rem", flexShrink: 0 } })
        ] }) }),
        /* @__PURE__ */ i("div", { style: h.heatmapRow, children: [
          /* @__PURE__ */ i("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#334155" }, children: "Heatmap" }),
          /* @__PURE__ */ i("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" }, children: [
            /* @__PURE__ */ i(
              "button",
              {
                role: "switch",
                tabIndex: 0,
                style: h.toggle(C),
                onClick: B,
                onKeyDown: (y) => y.key === "Enter" && B(),
                children: /* @__PURE__ */ i("span", { style: h.toggleThumb(C) })
              }
            ),
            /* @__PURE__ */ i("button", { type: "button", style: { ...h.iconBtn, border: "1px solid #e2e8f0", borderRadius: "0.75rem" }, children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.125rem" } }) })
          ] })
        ] }),
        /* @__PURE__ */ i("div", { style: { display: "flex", gap: "0.75rem", marginTop: "1.5rem" }, children: [
          /* @__PURE__ */ i("button", { type: "button", style: { ...h.primaryBtn, flex: 1 }, onClick: () => t({ type: "TAG_FEATURE_CLICKED" }), children: "Tag Feature" }),
          /* @__PURE__ */ i("button", { type: "button", style: h.secondaryBtn, onClick: () => t({ type: "CLEAR_SELECTION_CLICKED" }), children: "Clear Selection" })
        ] })
      ] }),
      m === "pages" && /* @__PURE__ */ i("div", { style: h.comingSoon, children: [
        /* @__PURE__ */ i("div", { style: h.comingSoonIcon, children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:file-document-multiple", style: { fontSize: "1.875rem", color: "#94a3b8" } }) }),
        /* @__PURE__ */ i("p", { style: { color: "#64748b", fontSize: "0.875rem" }, children: "Pages view — coming soon" })
      ] }),
      m === "ai-agents" && /* @__PURE__ */ i("div", { style: h.comingSoon, children: [
        /* @__PURE__ */ i("div", { style: h.comingSoonIcon, children: /* @__PURE__ */ i("iconify-icon", { icon: "mdi:robot", style: { fontSize: "1.875rem", color: "#94a3b8" } }) }),
        /* @__PURE__ */ i("p", { style: { color: "#64748b", fontSize: "0.875rem" }, children: "AI Agents — coming soon" })
      ] })
    ] }) })
  ] });
}
class Ut {
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
      border-radius: 16px;
      background: white;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
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
    this.elementSelectedState = { selector: e.selector, elementInfo: e.elementInfo }, this.renderEditorContent(), this.show();
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
  sendMessage(e) {
    if (!this.iframe || !this.isReady) {
      setTimeout(() => this.sendMessage(e), 100);
      return;
    }
    const n = this.iframe.contentWindow;
    n && n.postMessage(e, "*");
  }
  /**
   * Load editor HTML content (minimal shell - Preact renders the UI)
   */
  loadEditorHtml() {
    const e = this.getMinimalEditorHtml(), n = new Blob([e], { type: "text/html" }), r = URL.createObjectURL(n);
    this.iframe && (this.iframe.src = r);
  }
  /**
   * Render Preact editor component into iframe
   */
  renderEditorContent() {
    if (!this.iframe || !this.isReady) return;
    const e = this.iframe.contentDocument, n = e?.getElementById("designer-editor-root");
    if (!e || !n) return;
    const r = (o) => this.messageCallback?.(o);
    this.mode === "tag-page" ? O(
      /* @__PURE__ */ i(
        Ft,
        {
          onMessage: r,
          tagPageSavedAckCounter: this.tagPageSavedAckCounter
        }
      ),
      n
    ) : this.mode === "tag-feature" ? O(
      /* @__PURE__ */ i(
        Wt,
        {
          onMessage: r,
          elementSelected: this.elementSelectedState,
          tagFeatureSavedAckCounter: this.tagFeatureSavedAckCounter
        }
      ),
      n
    ) : O(
      /* @__PURE__ */ i(
        Mt,
        {
          onMessage: r,
          elementSelected: this.elementSelectedState
        }
      ),
      n
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
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Montserrat',-apple-system,BlinkMacSystemFont,sans-serif;padding:20px;background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);color:#0f172a;line-height:1.6;height:100%;overflow-y:auto;-webkit-font-smoothing:antialiased}</style>
  <style>${zt}</style>
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
      const c = Math.abs(e.clientX - this.mouseDownX), g = Math.abs(e.clientY - this.mouseDownY);
      if (Math.sqrt(c * c + g * g) > this.dragThreshold)
        this.isDragging = !0, document.body.style.cursor = "grabbing", document.documentElement.style.cursor = "grabbing", document.body.style.userSelect = "none", document.documentElement.style.userSelect = "none", this.iframe && (this.iframe.style.pointerEvents = "none"), this.gripButton && (this.gripButton.style.cursor = "grabbing");
      else
        return;
    }
    e.preventDefault(), e.stopPropagation();
    const n = e.clientX - this.dragStartX, r = e.clientY - this.dragStartY, o = window.innerWidth, a = window.innerHeight, l = this.iframe.offsetWidth, d = Math.max(-l + 50, Math.min(n, o - 50)), u = Math.max(0, Math.min(r, a - 100));
    this.iframe.style.left = `${d}px`, this.iframe.style.top = `${u}px`, this.iframe.style.right = "auto", this.iframe.style.bottom = "auto", this.dragHandle.style.left = `${d}px`, this.dragHandle.style.top = `${u}px`;
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
const Vt = "visual-designer-guides", We = "1.0.0";
class jt {
  storageKey;
  constructor(e = Vt) {
    this.storageKey = e;
  }
  getGuides() {
    try {
      const e = localStorage.getItem(this.storageKey);
      if (!e) return [];
      const n = JSON.parse(e);
      return n.version !== We ? (this.clear(), []) : n.guides || [];
    } catch {
      return [];
    }
  }
  getGuidesByPage(e) {
    return this.getGuides().filter((r) => r.page === e && r.status === "active");
  }
  saveGuide(e) {
    const n = this.getGuides(), r = n.findIndex((a) => a.id === e.id), o = {
      ...e,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: e.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    r >= 0 ? n[r] = o : n.push(o), this.saveGuides(n);
  }
  deleteGuide(e) {
    const n = this.getGuides().filter((r) => r.id !== e);
    this.saveGuides(n);
  }
  saveGuides(e) {
    const n = { guides: e, version: We };
    localStorage.setItem(this.storageKey, JSON.stringify(n));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(e) {
    return this.getGuides().find((n) => n.id === e) || null;
  }
}
function Yt({ onExit: t }) {
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
  return /* @__PURE__ */ i(
    "button",
    {
      id: "designer-exit-editor-btn",
      style: e,
      onClick: t,
      onMouseEnter: (n) => {
        n.currentTarget.style.background = _.primary, n.currentTarget.style.color = _.bg, n.currentTarget.style.transform = "translateY(-2px)", n.currentTarget.style.boxShadow = _.shadowHover;
      },
      onMouseLeave: (n) => {
        n.currentTarget.style.background = _.bg, n.currentTarget.style.color = _.primary, n.currentTarget.style.transform = "translateY(0)", n.currentTarget.style.boxShadow = _.shadow;
      },
      children: [
        /* @__PURE__ */ i("iconify-icon", { icon: "mdi:exit-to-app", style: { verticalAlign: "-0.2em", marginRight: "6px" } }),
        "Exit Editor"
      ]
    }
  );
}
function Kt() {
  return /* @__PURE__ */ i(
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
function Xt() {
  return /* @__PURE__ */ i(
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
function Jt() {
  return /* @__PURE__ */ i(
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
        fontFamily: _.fontFamily
      },
      children: [
        /* @__PURE__ */ i(
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
              /* @__PURE__ */ i(
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
              /* @__PURE__ */ i(
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
              /* @__PURE__ */ i(
                "div",
                {
                  style: {
                    fontSize: "0.8125rem",
                    color: "#64748b",
                    fontWeight: 500
                  },
                  children: [
                    /* @__PURE__ */ i("span", { style: { animation: "vd-dot1 1.4s ease-in-out infinite" }, children: "." }),
                    /* @__PURE__ */ i("span", { style: { animation: "vd-dot2 1.4s ease-in-out infinite" }, children: "." }),
                    /* @__PURE__ */ i("span", { style: { animation: "vd-dot3 1.4s ease-in-out infinite" }, children: "." })
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ i("style", { children: `
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
function qt(t) {
  return /* @__PURE__ */ i(X, { children: [
    t.showExitButton && /* @__PURE__ */ i(Yt, { onExit: t.onExitEditor }),
    t.showRedBorder && /* @__PURE__ */ i(Kt, {}),
    t.showBadge && /* @__PURE__ */ i(Xt, {}),
    t.showLoading && /* @__PURE__ */ i(Jt, {})
  ] });
}
function Qt(t, e) {
  O(/* @__PURE__ */ i(qt, { ...e }), t);
}
const Zt = "https://devgw.revgain.ai/rg-pex", ot = "designerIud";
function en() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(ot);
  } catch {
    return null;
  }
}
function te(t) {
  const e = {
    "Content-Type": "application/json",
    ...t
  }, n = en();
  return n && (e.iud = n), e;
}
const at = {
  baseUrl: Zt,
  async get(t, e) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      ...e,
      headers: { ...te(), ...e?.headers }
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async post(t, e, n) {
    const r = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, o = await fetch(r, {
      method: "POST",
      ...n,
      headers: { ...te(), ...n?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!o.ok) throw new Error(`API error: ${o.status} ${o.statusText}`);
    return o.json();
  },
  async put(t, e, n) {
    const r = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, o = await fetch(r, {
      method: "PUT",
      ...n,
      headers: { ...te(), ...n?.headers },
      body: e !== void 0 ? JSON.stringify(e) : void 0
    });
    if (!o.ok) throw new Error(`API error: ${o.status} ${o.statusText}`);
    return o.json();
  },
  async delete(t, e) {
    const n = t.startsWith("http") ? t : `${this.baseUrl}${t.startsWith("/") ? "" : "/"}${t}`, r = await fetch(n, {
      method: "DELETE",
      ...e,
      headers: { ...te(), ...e?.headers }
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  }
};
class st {
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
  constructor(e = {}) {
    this.config = e, this.storage = new jt(e.storageKey), this.editorMode = new ft(), this.guideRenderer = new Ct(), this.featureHeatmapRenderer = new Dt(), this.editorFrame = new Ut();
  }
  init() {
    if (this.isInitialized) return;
    this.isInitialized = !0, this.injectMontserratFont(), this.injectIconifyScript(), this.guideRenderer.setOnDismiss((n) => this.config.onGuideDismissed?.(n)), this.shouldEnableEditorMode() ? (this.showLoading = !0, this.renderOverlays(), this.enableEditor()) : this.loadGuides(), this.heatmapEnabled = localStorage.getItem("designerHeatmapEnabled") === "true", this.renderFeatureHeatmap(), this.setupEventListeners();
  }
  enableEditor() {
    if (this.isEditorMode) return;
    this.isEditorMode = !0;
    let e = typeof window < "u" && window.__visualDesignerMode || null;
    e || (e = localStorage.getItem("designerModeType") || null), this.editorFrame.create((r) => this.handleEditorMessage(r), e);
    const n = e === "tag-page" || e === "tag-feature";
    n || this.editorMode.activate((r) => this.handleEditorMessage(r)), this.ensureSDKRoot(), this.renderOverlays(), localStorage.setItem("designerMode", "true"), e && localStorage.setItem("designerModeType", e), setTimeout(() => {
      this.editorFrame.show(), this.renderOverlays();
    }, n ? 100 : 300), this.loadingFallbackTimer = setTimeout(() => {
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
    return this.storage.getGuidesByPage(oe());
  }
  saveGuide(e) {
    const n = {
      ...e,
      id: ke(),
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
      page: oe()
    });
  }
  async handleSaveTagPage(e) {
    const n = e.payload, r = typeof window < "u" ? window.location.href : "", o = typeof window < "u" ? `${window.location.hostname}${window.location.pathname}` : "";
    try {
      await at.post("/pages", {
        name: n.pageName,
        slug: o,
        description: n.description,
        status: "active"
      });
    } catch (l) {
      console.warn("[Visual Designer] Failed to create page via API:", l), this.editorFrame.sendTagPageSavedAck();
      return;
    }
    const a = "designerTaggedPages";
    try {
      const l = localStorage.getItem(a) || "[]", d = JSON.parse(l);
      d.push({ pageName: n.pageName, url: r }), localStorage.setItem(a, JSON.stringify(d));
    } catch {
    }
    this.editorFrame.sendTagPageSavedAck();
  }
  handleSaveTagFeature(e) {
    const n = "designerTaggedFeatures", r = e.payload;
    if (!(!r.selector || !r.featureName))
      try {
        const o = localStorage.getItem(n) || "[]", a = JSON.parse(o), l = typeof window < "u" ? window.location.href : "", d = {
          id: ke(),
          featureName: r.featureName,
          selector: r.selector,
          url: l,
          elementInfo: r.elementInfo,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        a.push(d), localStorage.setItem(n, JSON.stringify(a)), this.editorFrame.sendTagFeatureSavedAck(), this.renderFeatureHeatmap();
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
        clearTimeout(n), n = window.setTimeout(() => {
          r(), o();
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
    this.ensureSDKRoot(), this.sdkRoot && Qt(this.sdkRoot, {
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
let I = null, lt = !1;
function N(t) {
  return I || (I = new st(t), I.init(), I);
}
function dt() {
  return I;
}
function ct(t) {
  !t || !Array.isArray(t) || t.forEach((e) => {
    if (!e || !Array.isArray(e) || e.length === 0) return;
    const n = e[0], r = e.slice(1);
    try {
      switch (n) {
        case "initialize":
          N(r[0]);
          break;
        case "identify":
          r[0] && console.log("[Visual Designer] identify (snippet) called with:", r[0]);
          break;
        case "enableEditor":
          (I ?? N()).enableEditor();
          break;
        case "disableEditor":
          I?.disableEditor();
          break;
        case "loadGuides":
          I?.loadGuides();
          break;
        case "getGuides":
          return I?.getGuides();
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
  t && Array.isArray(t._q) && (lt = !0, t.initialize = (e) => N(e), t.identify = (e) => {
    e && console.log("[Visual Designer] identify (snippet) called with:", e);
  }, t.enableEditor = () => (I ?? N()).enableEditor(), t.disableEditor = () => I?.disableEditor(), t.loadGuides = () => I?.loadGuides(), t.getGuides = () => I?.getGuides(), t.getInstance = dt, t.init = N, ct(t._q));
  try {
    const e = new URL(window.location.href), n = e.searchParams.get("designer"), r = e.searchParams.get("mode"), o = e.searchParams.get("iud");
    n === "true" && (r && (window.__visualDesignerMode = r, localStorage.setItem("designerModeType", r)), localStorage.setItem("designerMode", "true"), o && localStorage.setItem(ot, o), e.searchParams.delete("designer"), e.searchParams.delete("mode"), e.searchParams.delete("iud"), window.history.replaceState({}, "", e.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !I && !lt) {
  const t = () => {
    I || N();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t) : t();
}
typeof window < "u" && (window.VisualDesigner = {
  init: N,
  initialize: N,
  getInstance: dt,
  DesignerSDK: st,
  apiClient: at,
  _processQueue: ct
});
export {
  st as DesignerSDK,
  ct as _processQueue,
  at as apiClient,
  dt as getInstance,
  N as init
};
