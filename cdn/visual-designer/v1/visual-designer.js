class tt {
  static generateSelector(t) {
    if (t.id)
      return {
        selector: `#${this.escapeSelector(t.id)}`,
        confidence: "high",
        method: "id"
      };
    if (t.hasAttribute("data-testid")) {
      const s = t.getAttribute("data-testid");
      return {
        selector: `[data-testid="${this.escapeAttribute(s)}"]`,
        confidence: "high",
        method: "data-testid"
      };
    }
    const i = this.getSemanticDataAttributes(t);
    if (i.length > 0) {
      const s = i[0], a = t.getAttribute(s);
      return {
        selector: `[${s}="${this.escapeAttribute(a)}"]`,
        confidence: "high",
        method: "data-attribute"
      };
    }
    const n = this.generateAriaSelector(t);
    if (n)
      return { selector: n, confidence: "medium", method: "aria" };
    const r = this.generatePathSelector(t);
    return r ? { selector: r, confidence: "medium", method: "path" } : {
      selector: t.tagName.toLowerCase(),
      confidence: "low",
      method: "tag"
    };
  }
  static findElement(t) {
    try {
      return document.querySelector(t);
    } catch {
      return null;
    }
  }
  static validateSelector(t) {
    try {
      return document.querySelector(t) !== null;
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
  static escapeSelector(t) {
    return typeof CSS < "u" && CSS.escape ? CSS.escape(t) : t.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }
  static escapeAttribute(t) {
    return t.replace(/"/g, '\\"').replace(/'/g, "\\'");
  }
}
function qi(e) {
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
function bt(e) {
  const t = window.getComputedStyle(e);
  return t.display !== "none" && t.visibility !== "hidden" && t.opacity !== "0" && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().width > 0;
}
function Te() {
  return window.location.pathname || "/";
}
function wt() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function Vi(e) {
  const t = e.getBoundingClientRect();
  return t.top >= 0 && t.left >= 0 && t.bottom <= (window.innerHeight || document.documentElement.clientHeight) && t.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function Yi(e) {
  Vi(e) || e.scrollIntoView({ behavior: "smooth", block: "center" });
}
const St = "#designer-editor-frame, #designer-highlight-overlay, #designer-exit-editor-btn, #designer-red-border-overlay, #designer-studio-badge";
class Xi {
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
      if (i.closest(St)) {
        this.hideHighlight();
        return;
      }
      if (!bt(i)) {
        this.hideHighlight();
        return;
      }
      this.highlightElement(i);
    }
  };
  handleClick = (t) => {
    if (!this.isActive) return;
    const i = t.target;
    i && (i.closest(St) || (t.preventDefault(), t.stopPropagation(), t.stopImmediatePropagation(), bt(i) && this.selectElement(i)));
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
    const i = tt.generateSelector(t), n = qi(t);
    this.messageCallback?.({
      type: "ELEMENT_SELECTED",
      selector: i.selector,
      elementInfo: n
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
var Fe, w, si, Y, Et, oi, ai, li, it, Ge, Qe, ci, de = {}, di = [], Ji = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, he = Array.isArray;
function W(e, t) {
  for (var i in t) e[i] = t[i];
  return e;
}
function nt(e) {
  e && e.parentNode && e.parentNode.removeChild(e);
}
function We(e, t, i) {
  var n, r, s, a = {};
  for (s in t) s == "key" ? n = t[s] : s == "ref" ? r = t[s] : a[s] = t[s];
  if (arguments.length > 2 && (a.children = arguments.length > 3 ? Fe.call(arguments, 2) : i), typeof e == "function" && e.defaultProps != null) for (s in e.defaultProps) a[s] === void 0 && (a[s] = e.defaultProps[s]);
  return xe(e, a, n, r, null);
}
function xe(e, t, i, n, r) {
  var s = { type: e, props: t, key: i, ref: n, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: r ?? ++si, __i: -1, __u: 0 };
  return r == null && w.vnode != null && w.vnode(s), s;
}
function V(e) {
  return e.children;
}
function j(e, t) {
  this.props = e, this.context = t;
}
function ne(e, t) {
  if (t == null) return e.__ ? ne(e.__, e.__i + 1) : null;
  for (var i; t < e.__k.length; t++) if ((i = e.__k[t]) != null && i.__e != null) return i.__e;
  return typeof e.type == "function" ? ne(e) : null;
}
function ui(e) {
  var t, i;
  if ((e = e.__) != null && e.__c != null) {
    for (e.__e = e.__c.base = null, t = 0; t < e.__k.length; t++) if ((i = e.__k[t]) != null && i.__e != null) {
      e.__e = e.__c.base = i.__e;
      break;
    }
    return ui(e);
  }
}
function je(e) {
  (!e.__d && (e.__d = !0) && Y.push(e) && !Ie.__r++ || Et != w.debounceRendering) && ((Et = w.debounceRendering) || oi)(Ie);
}
function Ie() {
  for (var e, t, i, n, r, s, a, l = 1; Y.length; ) Y.length > l && Y.sort(ai), e = Y.shift(), l = Y.length, e.__d && (i = void 0, n = void 0, r = (n = (t = e).__v).__e, s = [], a = [], t.__P && ((i = W({}, n)).__v = n.__v + 1, w.vnode && w.vnode(i), rt(t.__P, i, n, t.__n, t.__P.namespaceURI, 32 & n.__u ? [r] : null, s, r ?? ne(n), !!(32 & n.__u), a), i.__v = n.__v, i.__.__k[i.__i] = i, pi(s, i, a), n.__e = n.__ = null, i.__e != r && ui(i)));
  Ie.__r = 0;
}
function hi(e, t, i, n, r, s, a, l, u, c, h) {
  var d, p, m, v, _, b, g, y = n && n.__k || di, T = t.length;
  for (u = Zi(i, t, y, u, T), d = 0; d < T; d++) (m = i.__k[d]) != null && (p = m.__i == -1 ? de : y[m.__i] || de, m.__i = d, b = rt(e, m, p, r, s, a, l, u, c, h), v = m.__e, m.ref && p.ref != m.ref && (p.ref && st(p.ref, null, m), h.push(m.ref, m.__c || v, m)), _ == null && v != null && (_ = v), (g = !!(4 & m.__u)) || p.__k === m.__k ? u = fi(m, u, e, g) : typeof m.type == "function" && b !== void 0 ? u = b : v && (u = v.nextSibling), m.__u &= -7);
  return i.__e = _, u;
}
function Zi(e, t, i, n, r) {
  var s, a, l, u, c, h = i.length, d = h, p = 0;
  for (e.__k = new Array(r), s = 0; s < r; s++) (a = t[s]) != null && typeof a != "boolean" && typeof a != "function" ? (typeof a == "string" || typeof a == "number" || typeof a == "bigint" || a.constructor == String ? a = e.__k[s] = xe(null, a, null, null, null) : he(a) ? a = e.__k[s] = xe(V, { children: a }, null, null, null) : a.constructor === void 0 && a.__b > 0 ? a = e.__k[s] = xe(a.type, a.props, a.key, a.ref ? a.ref : null, a.__v) : e.__k[s] = a, u = s + p, a.__ = e, a.__b = e.__b + 1, l = null, (c = a.__i = en(a, i, u, d)) != -1 && (d--, (l = i[c]) && (l.__u |= 2)), l == null || l.__v == null ? (c == -1 && (r > h ? p-- : r < h && p++), typeof a.type != "function" && (a.__u |= 4)) : c != u && (c == u - 1 ? p-- : c == u + 1 ? p++ : (c > u ? p-- : p++, a.__u |= 4))) : e.__k[s] = null;
  if (d) for (s = 0; s < h; s++) (l = i[s]) != null && (2 & l.__u) == 0 && (l.__e == n && (n = ne(l)), gi(l, l));
  return n;
}
function fi(e, t, i, n) {
  var r, s;
  if (typeof e.type == "function") {
    for (r = e.__k, s = 0; r && s < r.length; s++) r[s] && (r[s].__ = e, t = fi(r[s], t, i, n));
    return t;
  }
  e.__e != t && (n && (t && e.type && !t.parentNode && (t = ne(e)), i.insertBefore(e.__e, t || null)), t = e.__e);
  do
    t = t && t.nextSibling;
  while (t != null && t.nodeType == 8);
  return t;
}
function Re(e, t) {
  return t = t || [], e == null || typeof e == "boolean" || (he(e) ? e.some(function(i) {
    Re(i, t);
  }) : t.push(e)), t;
}
function en(e, t, i, n) {
  var r, s, a, l = e.key, u = e.type, c = t[i], h = c != null && (2 & c.__u) == 0;
  if (c === null && l == null || h && l == c.key && u == c.type) return i;
  if (n > (h ? 1 : 0)) {
    for (r = i - 1, s = i + 1; r >= 0 || s < t.length; ) if ((c = t[a = r >= 0 ? r-- : s++]) != null && (2 & c.__u) == 0 && l == c.key && u == c.type) return a;
  }
  return -1;
}
function xt(e, t, i) {
  t[0] == "-" ? e.setProperty(t, i ?? "") : e[t] = i == null ? "" : typeof i != "number" || Ji.test(t) ? i : i + "px";
}
function ye(e, t, i, n, r) {
  var s, a;
  e: if (t == "style") if (typeof i == "string") e.style.cssText = i;
  else {
    if (typeof n == "string" && (e.style.cssText = n = ""), n) for (t in n) i && t in i || xt(e.style, t, "");
    if (i) for (t in i) n && i[t] == n[t] || xt(e.style, t, i[t]);
  }
  else if (t[0] == "o" && t[1] == "n") s = t != (t = t.replace(li, "$1")), a = t.toLowerCase(), t = a in e || t == "onFocusOut" || t == "onFocusIn" ? a.slice(2) : t.slice(2), e.l || (e.l = {}), e.l[t + s] = i, i ? n ? i.u = n.u : (i.u = it, e.addEventListener(t, s ? Qe : Ge, s)) : e.removeEventListener(t, s ? Qe : Ge, s);
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
function Ct(e) {
  return function(t) {
    if (this.l) {
      var i = this.l[t.type + e];
      if (t.t == null) t.t = it++;
      else if (t.t < i.u) return;
      return i(w.event ? w.event(t) : t);
    }
  };
}
function rt(e, t, i, n, r, s, a, l, u, c) {
  var h, d, p, m, v, _, b, g, y, T, P, A, L, D, k, U, N, R = t.type;
  if (t.constructor !== void 0) return null;
  128 & i.__u && (u = !!(32 & i.__u), s = [l = t.__e = i.__e]), (h = w.__b) && h(t);
  e: if (typeof R == "function") try {
    if (g = t.props, y = "prototype" in R && R.prototype.render, T = (h = R.contextType) && n[h.__c], P = h ? T ? T.props.value : h.__ : n, i.__c ? b = (d = t.__c = i.__c).__ = d.__E : (y ? t.__c = d = new R(g, P) : (t.__c = d = new j(g, P), d.constructor = R, d.render = nn), T && T.sub(d), d.state || (d.state = {}), d.__n = n, p = d.__d = !0, d.__h = [], d._sb = []), y && d.__s == null && (d.__s = d.state), y && R.getDerivedStateFromProps != null && (d.__s == d.state && (d.__s = W({}, d.__s)), W(d.__s, R.getDerivedStateFromProps(g, d.__s))), m = d.props, v = d.state, d.__v = t, p) y && R.getDerivedStateFromProps == null && d.componentWillMount != null && d.componentWillMount(), y && d.componentDidMount != null && d.__h.push(d.componentDidMount);
    else {
      if (y && R.getDerivedStateFromProps == null && g !== m && d.componentWillReceiveProps != null && d.componentWillReceiveProps(g, P), t.__v == i.__v || !d.__e && d.shouldComponentUpdate != null && d.shouldComponentUpdate(g, d.__s, P) === !1) {
        for (t.__v != i.__v && (d.props = g, d.state = d.__s, d.__d = !1), t.__e = i.__e, t.__k = i.__k, t.__k.some(function(S) {
          S && (S.__ = t);
        }), A = 0; A < d._sb.length; A++) d.__h.push(d._sb[A]);
        d._sb = [], d.__h.length && a.push(d);
        break e;
      }
      d.componentWillUpdate != null && d.componentWillUpdate(g, d.__s, P), y && d.componentDidUpdate != null && d.__h.push(function() {
        d.componentDidUpdate(m, v, _);
      });
    }
    if (d.context = P, d.props = g, d.__P = e, d.__e = !1, L = w.__r, D = 0, y) {
      for (d.state = d.__s, d.__d = !1, L && L(t), h = d.render(d.props, d.state, d.context), k = 0; k < d._sb.length; k++) d.__h.push(d._sb[k]);
      d._sb = [];
    } else do
      d.__d = !1, L && L(t), h = d.render(d.props, d.state, d.context), d.state = d.__s;
    while (d.__d && ++D < 25);
    d.state = d.__s, d.getChildContext != null && (n = W(W({}, n), d.getChildContext())), y && !p && d.getSnapshotBeforeUpdate != null && (_ = d.getSnapshotBeforeUpdate(m, v)), U = h, h != null && h.type === V && h.key == null && (U = mi(h.props.children)), l = hi(e, he(U) ? U : [U], t, i, n, r, s, a, l, u, c), d.base = t.__e, t.__u &= -161, d.__h.length && a.push(d), b && (d.__E = d.__ = null);
  } catch (S) {
    if (t.__v = null, u || s != null) if (S.then) {
      for (t.__u |= u ? 160 : 128; l && l.nodeType == 8 && l.nextSibling; ) l = l.nextSibling;
      s[s.indexOf(l)] = null, t.__e = l;
    } else {
      for (N = s.length; N--; ) nt(s[N]);
      Ke(t);
    }
    else t.__e = i.__e, t.__k = i.__k, S.then || Ke(t);
    w.__e(S, t, i);
  }
  else s == null && t.__v == i.__v ? (t.__k = i.__k, t.__e = i.__e) : l = t.__e = tn(i.__e, t, i, n, r, s, a, u, c);
  return (h = w.diffed) && h(t), 128 & t.__u ? void 0 : l;
}
function Ke(e) {
  e && e.__c && (e.__c.__e = !0), e && e.__k && e.__k.forEach(Ke);
}
function pi(e, t, i) {
  for (var n = 0; n < i.length; n++) st(i[n], i[++n], i[++n]);
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
function mi(e) {
  return typeof e != "object" || e == null || e.__b && e.__b > 0 ? e : he(e) ? e.map(mi) : W({}, e);
}
function tn(e, t, i, n, r, s, a, l, u) {
  var c, h, d, p, m, v, _, b = i.props || de, g = t.props, y = t.type;
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
    if (s = s && Fe.call(e.childNodes), !l && s != null) for (b = {}, c = 0; c < e.attributes.length; c++) b[(m = e.attributes[c]).name] = m.value;
    for (c in b) if (m = b[c], c != "children") {
      if (c == "dangerouslySetInnerHTML") d = m;
      else if (!(c in g)) {
        if (c == "value" && "defaultValue" in g || c == "checked" && "defaultChecked" in g) continue;
        ye(e, c, null, m, r);
      }
    }
    for (c in g) m = g[c], c == "children" ? p = m : c == "dangerouslySetInnerHTML" ? h = m : c == "value" ? v = m : c == "checked" ? _ = m : l && typeof m != "function" || b[c] === m || ye(e, c, m, b[c], r);
    if (h) l || d && (h.__html == d.__html || h.__html == e.innerHTML) || (e.innerHTML = h.__html), t.__k = [];
    else if (d && (e.innerHTML = ""), hi(t.type == "template" ? e.content : e, he(p) ? p : [p], t, i, n, y == "foreignObject" ? "http://www.w3.org/1999/xhtml" : r, s, a, s ? s[0] : i.__k && ne(i, 0), l, u), s != null) for (c = s.length; c--; ) nt(s[c]);
    l || (c = "value", y == "progress" && v == null ? e.removeAttribute("value") : v != null && (v !== e[c] || y == "progress" && !v || y == "option" && v != b[c]) && ye(e, c, v, b[c], r), c = "checked", _ != null && _ != e[c] && ye(e, c, _, b[c], r));
  }
  return e;
}
function st(e, t, i) {
  try {
    if (typeof e == "function") {
      var n = typeof e.__u == "function";
      n && e.__u(), n && t == null || (e.__u = e(t));
    } else e.current = t;
  } catch (r) {
    w.__e(r, i);
  }
}
function gi(e, t, i) {
  var n, r;
  if (w.unmount && w.unmount(e), (n = e.ref) && (n.current && n.current != e.__e || st(n, null, t)), (n = e.__c) != null) {
    if (n.componentWillUnmount) try {
      n.componentWillUnmount();
    } catch (s) {
      w.__e(s, t);
    }
    n.base = n.__P = null;
  }
  if (n = e.__k) for (r = 0; r < n.length; r++) n[r] && gi(n[r], t, i || typeof e.type != "function");
  i || nt(e.__e), e.__c = e.__ = e.__e = void 0;
}
function nn(e, t, i) {
  return this.constructor(e, i);
}
function re(e, t, i) {
  var n, r, s, a;
  t == document && (t = document.documentElement), w.__ && w.__(e, t), r = (n = !1) ? null : t.__k, s = [], a = [], rt(t, e = t.__k = We(V, null, [e]), r || de, de, t.namespaceURI, r ? null : t.firstChild ? Fe.call(t.childNodes) : null, s, r ? r.__e : t.firstChild, n, a), pi(s, e, a);
}
function ot(e) {
  function t(i) {
    var n, r;
    return this.getChildContext || (n = /* @__PURE__ */ new Set(), (r = {})[t.__c] = this, this.getChildContext = function() {
      return r;
    }, this.componentWillUnmount = function() {
      n = null;
    }, this.shouldComponentUpdate = function(s) {
      this.props.value != s.value && n.forEach(function(a) {
        a.__e = !0, je(a);
      });
    }, this.sub = function(s) {
      n.add(s);
      var a = s.componentWillUnmount;
      s.componentWillUnmount = function() {
        n && n.delete(s), a && a.call(s);
      };
    }), i.children;
  }
  return t.__c = "__cC" + ci++, t.__ = e, t.Provider = t.__l = (t.Consumer = function(i, n) {
    return i.children(n);
  }).contextType = t, t;
}
Fe = di.slice, w = { __e: function(e, t, i, n) {
  for (var r, s, a; t = t.__; ) if ((r = t.__c) && !r.__) try {
    if ((s = r.constructor) && s.getDerivedStateFromError != null && (r.setState(s.getDerivedStateFromError(e)), a = r.__d), r.componentDidCatch != null && (r.componentDidCatch(e, n || {}), a = r.__d), a) return r.__E = r;
  } catch (l) {
    e = l;
  }
  throw e;
} }, si = 0, j.prototype.setState = function(e, t) {
  var i;
  i = this.__s != null && this.__s != this.state ? this.__s : this.__s = W({}, this.state), typeof e == "function" && (e = e(W({}, i), this.props)), e && W(i, e), e != null && this.__v && (t && this._sb.push(t), je(this));
}, j.prototype.forceUpdate = function(e) {
  this.__v && (this.__e = !0, e && this.__h.push(e), je(this));
}, j.prototype.render = V, Y = [], oi = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, ai = function(e, t) {
  return e.__v.__b - t.__v.__b;
}, Ie.__r = 0, li = /(PointerCapture)$|Capture$/i, it = 0, Ge = Ct(!1), Qe = Ct(!0), ci = 0;
var rn = 0;
function o(e, t, i, n, r, s) {
  t || (t = {});
  var a, l, u = t;
  if ("ref" in u) for (l in u = {}, t) l == "ref" ? a = t[l] : u[l] = t[l];
  var c = { type: e, props: u, key: i, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --rn, __i: -1, __u: 0, __source: r, __self: s };
  if (typeof e == "function" && (a = e.defaultProps)) for (l in a) u[l] === void 0 && (u[l] = a[l]);
  return w.vnode && w.vnode(c), c;
}
const E = {
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
function sn({ guide: e, top: t, left: i, arrowStyle: n, onDismiss: r }) {
  return /* @__PURE__ */ o(
    "div",
    {
      className: "designer-guide-tooltip",
      "data-guide-id": e.id,
      style: {
        position: "absolute",
        background: E.bg,
        border: `2px solid ${E.primary}`,
        borderRadius: E.borderRadius,
        padding: "12px 16px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
        zIndex: E.zIndex.tooltip,
        maxWidth: 300,
        fontFamily: E.fontFamily,
        fontSize: 14,
        lineHeight: 1.5,
        color: E.text,
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
              background: E.primary,
              color: E.bg,
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
function on(e) {
  const t = { position: "absolute" };
  switch (e) {
    case "top":
      return { ...t, bottom: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "8px 8px 0 8px", borderColor: `${E.primary} transparent transparent transparent` };
    case "bottom":
      return { ...t, top: "-8px", left: "50%", transform: "translateX(-50%)", borderWidth: "0 8px 8px 8px", borderColor: `transparent transparent ${E.primary} transparent` };
    case "left":
      return { ...t, right: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 0 8px 8px", borderColor: `transparent transparent transparent ${E.primary}` };
    default:
      return { ...t, left: "-8px", top: "50%", transform: "translateY(-50%)", borderWidth: "8px 8px 8px 0", borderColor: `transparent ${E.primary} transparent transparent` };
  }
}
function an(e, t, i, n) {
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
  return h < s ? h = s + 10 : h + i > s + l && (h = s + l - i - 10), c < a ? c = a + 10 : c + n > a + u && (c = a + u - n - 10), { top: c, left: h, arrowStyle: on(t) };
}
class ln {
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
    const i = Te(), n = t.filter(
      (s) => s.page === i && s.status === "active" && !this.dismissedThisSession.has(s.id)
    );
    if (n.length === 0 || (this.ensureContainer(), !this.container)) return;
    const r = [];
    for (const s of n) {
      const a = tt.findElement(s.selector);
      if (!a) continue;
      Yi(a);
      const l = an(a, s.placement, 280, 80);
      r.push({ guide: s, target: a, pos: l });
    }
    re(
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
            zIndex: E.zIndex.guides
          },
          children: r.map(({ guide: s, pos: a }) => /* @__PURE__ */ o(
            sn,
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
    this.dismissedThisSession.clear(), this.container && re(null, this.container);
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
const kt = [
  "rgba(251, 191, 36, 0.35)",
  "rgba(34, 197, 94, 0.35)",
  "rgba(249, 115, 22, 0.35)"
];
function cn({ feature: e, color: t, rect: i }) {
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
        zIndex: E.zIndex.overlay,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2px solid ${t}`
      }
    }
  );
}
function Tt(e) {
  return (e || "").replace(/^https?:\/\//i, "").replace(/\/$/, "").trim() || "";
}
function dn() {
  try {
    return window.location.href || "";
  } catch {
    return "";
  }
}
class un {
  container = null;
  lastEnabled = !1;
  render(t, i) {
    if (this.lastEnabled = i, this.clear(), !i || t.length === 0) return;
    const n = dn(), r = Tt(n), s = t.filter((l) => l.url && Tt(l.url) === r);
    if (s.length === 0 || (this.ensureContainer(), !this.container)) return;
    const a = s.map((l, u) => {
      const c = tt.findElement(l.selector);
      if (!c) return null;
      const h = c.getBoundingClientRect(), d = kt[u % kt.length];
      return { feature: l, rect: h, color: d };
    }).filter(Boolean);
    re(
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
            zIndex: E.zIndex.overlay - 1
          },
          children: a.map(({ feature: l, rect: u, color: c }) => /* @__PURE__ */ o(
            cn,
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
    this.container && re(null, this.container);
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
var se = class {
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
}, hn = {
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
}, fn = class {
  // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
  // type at app boot; and if we leave that type, then any new timer provider
  // would need to support ReturnType<typeof setTimeout>, which is infeasible.
  //
  // We settle for type safety for the TimeoutProvider type, and accept that
  // this class is unsafe internally to allow for extension.
  #e = hn;
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
}, X = new fn();
function pn(e) {
  setTimeout(e, 0);
}
var Z = typeof window > "u" || "Deno" in globalThis;
function $() {
}
function mn(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function qe(e) {
  return typeof e == "number" && e >= 0 && e !== 1 / 0;
}
function yi(e, t) {
  return Math.max(e + (t || 0) - Date.now(), 0);
}
function K(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function G(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function It(e, t) {
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
      if (t.queryHash !== at(a, t.options))
        return !1;
    } else if (!ue(t.queryKey, a))
      return !1;
  }
  if (i !== "all") {
    const u = t.isActive();
    if (i === "active" && !u || i === "inactive" && u)
      return !1;
  }
  return !(typeof l == "boolean" && t.isStale() !== l || r && r !== t.state.fetchStatus || s && !s(t));
}
function Rt(e, t) {
  const { exact: i, status: n, predicate: r, mutationKey: s } = e;
  if (s) {
    if (!t.options.mutationKey)
      return !1;
    if (i) {
      if (ee(t.options.mutationKey) !== ee(s))
        return !1;
    } else if (!ue(t.options.mutationKey, s))
      return !1;
  }
  return !(n && t.state.status !== n || r && !r(t));
}
function at(e, t) {
  return (t?.queryKeyHashFn || ee)(e);
}
function ee(e) {
  return JSON.stringify(
    e,
    (t, i) => Ve(i) ? Object.keys(i).sort().reduce((n, r) => (n[r] = i[r], n), {}) : i
  );
}
function ue(e, t) {
  return e === t ? !0 : typeof e != typeof t ? !1 : e && t && typeof e == "object" && typeof t == "object" ? Object.keys(t).every((i) => ue(e[i], t[i])) : !1;
}
var gn = Object.prototype.hasOwnProperty;
function _i(e, t, i = 0) {
  if (e === t)
    return e;
  if (i > 500) return t;
  const n = Ot(e) && Ot(t);
  if (!n && !(Ve(e) && Ve(t))) return t;
  const s = (n ? e : Object.keys(e)).length, a = n ? t : Object.keys(t), l = a.length, u = n ? new Array(l) : {};
  let c = 0;
  for (let h = 0; h < l; h++) {
    const d = n ? h : a[h], p = e[d], m = t[d];
    if (p === m) {
      u[d] = p, (n ? h < s : gn.call(e, d)) && c++;
      continue;
    }
    if (p === null || m === null || typeof p != "object" || typeof m != "object") {
      u[d] = m;
      continue;
    }
    const v = _i(p, m, i + 1);
    u[d] = v, v === p && c++;
  }
  return s === l && c === s ? e : u;
}
function Oe(e, t) {
  if (!t || Object.keys(e).length !== Object.keys(t).length)
    return !1;
  for (const i in e)
    if (e[i] !== t[i])
      return !1;
  return !0;
}
function Ot(e) {
  return Array.isArray(e) && e.length === Object.keys(e).length;
}
function Ve(e) {
  if (!Pt(e))
    return !1;
  const t = e.constructor;
  if (t === void 0)
    return !0;
  const i = t.prototype;
  return !(!Pt(i) || !i.hasOwnProperty("isPrototypeOf") || Object.getPrototypeOf(e) !== Object.prototype);
}
function Pt(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function yn(e) {
  return new Promise((t) => {
    X.setTimeout(t, e);
  });
}
function Ye(e, t, i) {
  return typeof i.structuralSharing == "function" ? i.structuralSharing(e, t) : i.structuralSharing !== !1 ? _i(e, t) : t;
}
function _n(e, t, i = 0) {
  const n = [...e, t];
  return i && n.length > i ? n.slice(1) : n;
}
function vn(e, t, i = 0) {
  const n = [t, ...e];
  return i && n.length > i ? n.slice(0, -1) : n;
}
var lt = /* @__PURE__ */ Symbol();
function vi(e, t) {
  return !e.queryFn && t?.initialPromise ? () => t.initialPromise : !e.queryFn || e.queryFn === lt ? () => Promise.reject(new Error(`Missing queryFn: '${e.queryHash}'`)) : e.queryFn;
}
function ct(e, t) {
  return typeof e == "function" ? e(...t) : !!e;
}
function bn(e, t, i) {
  let n = !1, r;
  return Object.defineProperty(e, "signal", {
    enumerable: !0,
    get: () => (r ??= t(), n || (n = !0, r.aborted ? i() : r.addEventListener("abort", i, { once: !0 })), r)
  }), e;
}
var wn = class extends se {
  #e;
  #t;
  #i;
  constructor() {
    super(), this.#i = (e) => {
      if (!Z && window.addEventListener) {
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
}, dt = new wn();
function Xe() {
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
var Sn = pn;
function En() {
  let e = [], t = 0, i = (l) => {
    l();
  }, n = (l) => {
    l();
  }, r = Sn;
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
var M = En(), xn = class extends se {
  #e = !0;
  #t;
  #i;
  constructor() {
    super(), this.#i = (e) => {
      if (!Z && window.addEventListener) {
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
}, Pe = new xn();
function Cn(e) {
  return Math.min(1e3 * 2 ** e, 3e4);
}
function bi(e) {
  return (e ?? "online") === "online" ? Pe.isOnline() : !0;
}
var Je = class extends Error {
  constructor(e) {
    super("CancelledError"), this.revert = e?.revert, this.silent = e?.silent;
  }
};
function wi(e) {
  let t = !1, i = 0, n;
  const r = Xe(), s = () => r.status !== "pending", a = (_) => {
    if (!s()) {
      const b = new Je(_);
      p(b), e.onCancel?.(b);
    }
  }, l = () => {
    t = !0;
  }, u = () => {
    t = !1;
  }, c = () => dt.isFocused() && (e.networkMode === "always" || Pe.isOnline()) && e.canRun(), h = () => bi(e.networkMode) && e.canRun(), d = (_) => {
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
      const y = e.retry ?? (Z ? 0 : 3), T = e.retryDelay ?? Cn, P = typeof T == "function" ? T(i, g) : T, A = y === !0 || typeof y == "number" && i < y || typeof y == "function" && y(i, g);
      if (t || !A) {
        p(g);
        return;
      }
      i++, e.onFail?.(i, g), yn(P).then(() => c() ? void 0 : m()).then(() => {
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
var Si = class {
  #e;
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout(), qe(this.gcTime) && (this.#e = X.setTimeout(() => {
      this.optionalRemove();
    }, this.gcTime));
  }
  updateGcTime(e) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      e ?? (Z ? 1 / 0 : 300 * 1e3)
    );
  }
  clearGcTimeout() {
    this.#e && (X.clearTimeout(this.#e), this.#e = void 0);
  }
}, kn = class extends Si {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  constructor(e) {
    super(), this.#a = !1, this.#o = e.defaultOptions, this.setOptions(e.options), this.observers = [], this.#r = e.client, this.#i = this.#r.getQueryCache(), this.queryKey = e.queryKey, this.queryHash = e.queryHash, this.#e = Ft(this.options), this.state = e.state ?? this.#e, this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    return this.#n?.promise;
  }
  setOptions(e) {
    if (this.options = { ...this.#o, ...e }, this.updateGcTime(this.options.gcTime), this.state && this.state.data === void 0) {
      const t = Ft(this.options);
      t.data !== void 0 && (this.setState(
        Dt(t.data, t.dataUpdatedAt)
      ), this.#e = t);
    }
  }
  optionalRemove() {
    !this.observers.length && this.state.fetchStatus === "idle" && this.#i.remove(this);
  }
  setData(e, t) {
    const i = Ye(this.state.data, e, this.options);
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
      (e) => G(e.options.enabled, this) !== !1
    );
  }
  isDisabled() {
    return this.getObserversCount() > 0 ? !this.isActive() : this.options.queryFn === lt || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (e) => K(e.options.staleTime, this) === "static"
    ) : !1;
  }
  isStale() {
    return this.getObserversCount() > 0 ? this.observers.some(
      (e) => e.getCurrentResult().isStale
    ) : this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(e = 0) {
    return this.state.data === void 0 ? !0 : e === "static" ? !1 : this.state.isInvalidated ? !0 : !yi(this.state.dataUpdatedAt, e);
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
      const l = vi(this.options, t), c = (() => {
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
    this.options.behavior?.onFetch(a, this), this.#t = this.state, (this.state.fetchStatus === "idle" || this.state.fetchMeta !== a.fetchOptions?.meta) && this.#s({ type: "fetch", meta: a.fetchOptions?.meta }), this.#n = wi({
      initialPromise: t?.initialPromise,
      fn: a.fetchFn,
      onCancel: (l) => {
        l instanceof Je && l.revert && this.setState({
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
      if (l instanceof Je) {
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
            ...Ei(i.data, this.options),
            fetchMeta: e.meta ?? null
          };
        case "success":
          const n = {
            ...i,
            ...Dt(e.data, e.dataUpdatedAt),
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
    this.state = t(this.state), M.batch(() => {
      this.observers.forEach((i) => {
        i.onQueryUpdate();
      }), this.#i.notify({ query: this, type: "updated", action: e });
    });
  }
};
function Ei(e, t) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: bi(t.networkMode) ? "fetching" : "paused",
    ...e === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function Dt(e, t) {
  return {
    data: e,
    dataUpdatedAt: t ?? Date.now(),
    error: null,
    isInvalidated: !1,
    status: "success"
  };
}
function Ft(e) {
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
var Tn = class extends se {
  constructor(e, t) {
    super(), this.options = t, this.#e = e, this.#s = null, this.#a = Xe(), this.bindMethods(), this.setOptions(t);
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
    this.listeners.size === 1 && (this.#t.addObserver(this), Mt(this.#t, this.options) ? this.#u() : this.updateResult(), this.#v());
  }
  onUnsubscribe() {
    this.hasListeners() || this.destroy();
  }
  shouldFetchOnReconnect() {
    return Ze(
      this.#t,
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return Ze(
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
    if (this.options = this.#e.defaultQueryOptions(e), this.options.enabled !== void 0 && typeof this.options.enabled != "boolean" && typeof this.options.enabled != "function" && typeof G(this.options.enabled, this.#t) != "boolean")
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    this.#S(), this.#t.setOptions(this.options), t._defaulted && !Oe(this.options, t) && this.#e.getQueryCache().notify({
      type: "observerOptionsUpdated",
      query: this.#t,
      observer: this
    });
    const n = this.hasListeners();
    n && At(
      this.#t,
      i,
      this.options,
      t
    ) && this.#u(), this.updateResult(), n && (this.#t !== i || G(this.options.enabled, this.#t) !== G(t.enabled, this.#t) || K(this.options.staleTime, this.#t) !== K(t.staleTime, this.#t)) && this.#g();
    const r = this.#y();
    n && (this.#t !== i || G(this.options.enabled, this.#t) !== G(t.enabled, this.#t) || r !== this.#l) && this.#_(r);
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
    const e = K(
      this.options.staleTime,
      this.#t
    );
    if (Z || this.#r.isStale || !qe(e))
      return;
    const i = yi(this.#r.dataUpdatedAt, e) + 1;
    this.#c = X.setTimeout(() => {
      this.#r.isStale || this.updateResult();
    }, i);
  }
  #y() {
    return (typeof this.options.refetchInterval == "function" ? this.options.refetchInterval(this.#t) : this.options.refetchInterval) ?? !1;
  }
  #_(e) {
    this.#w(), this.#l = e, !(Z || G(this.options.enabled, this.#t) === !1 || !qe(this.#l) || this.#l === 0) && (this.#d = X.setInterval(() => {
      (this.options.refetchIntervalInBackground || dt.isFocused()) && this.#u();
    }, this.#l));
  }
  #v() {
    this.#g(), this.#_(this.#y());
  }
  #b() {
    this.#c && (X.clearTimeout(this.#c), this.#c = void 0);
  }
  #w() {
    this.#d && (X.clearInterval(this.#d), this.#d = void 0);
  }
  createResult(e, t) {
    const i = this.#t, n = this.options, r = this.#r, s = this.#n, a = this.#o, u = e !== i ? e.state : this.#i, { state: c } = e;
    let h = { ...c }, d = !1, p;
    if (t._optimisticResults) {
      const k = this.hasListeners(), U = !k && Mt(e, t), N = k && At(e, i, t, n);
      (U || N) && (h = {
        ...h,
        ...Ei(c.data, e.options)
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
      ) : t.placeholderData, k !== void 0 && (_ = "success", p = Ye(
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
          this.#m = t.select, p = t.select(p), p = Ye(r?.data, p, t), this.#h = p, this.#s = null;
        } catch (k) {
          this.#s = k;
        }
    this.#s && (m = this.#s, p = this.#h, v = Date.now(), _ = "error");
    const g = h.fetchStatus === "fetching", y = _ === "pending", T = _ === "error", P = y && g, A = p !== void 0, D = {
      status: _,
      fetchStatus: h.fetchStatus,
      isPending: y,
      isSuccess: _ === "success",
      isError: T,
      isInitialLoading: P,
      isLoading: P,
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
      isLoadingError: T && !A,
      isPaused: h.fetchStatus === "paused",
      isPlaceholderData: d,
      isRefetchError: T && A,
      isStale: ut(e, t),
      refetch: this.refetch,
      promise: this.#a,
      isEnabled: G(t.enabled, e) !== !1
    };
    if (this.options.experimental_prefetchInRender) {
      const k = D.data !== void 0, U = D.status === "error" && !k, N = (B) => {
        U ? B.reject(D.error) : k && B.resolve(D.data);
      }, R = () => {
        const B = this.#a = D.promise = Xe();
        N(B);
      }, S = this.#a;
      switch (S.status) {
        case "pending":
          e.queryHash === i.queryHash && N(S);
          break;
        case "fulfilled":
          (U || D.data !== S.value) && R();
          break;
        case "rejected":
          (!U || D.error !== S.reason) && R();
          break;
      }
    }
    return D;
  }
  updateResult() {
    const e = this.#r, t = this.createResult(this.#t, this.options);
    if (this.#n = this.#t.state, this.#o = this.options, this.#n.data !== void 0 && (this.#f = this.#t), Oe(t, e))
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
    M.batch(() => {
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
  return G(t.enabled, e) !== !1 && e.state.data === void 0 && !(e.state.status === "error" && t.retryOnMount === !1);
}
function Mt(e, t) {
  return In(e, t) || e.state.data !== void 0 && Ze(e, t, t.refetchOnMount);
}
function Ze(e, t, i) {
  if (G(t.enabled, e) !== !1 && K(t.staleTime, e) !== "static") {
    const n = typeof i == "function" ? i(e) : i;
    return n === "always" || n !== !1 && ut(e, t);
  }
  return !1;
}
function At(e, t, i, n) {
  return (e !== t || G(n.enabled, e) === !1) && (!i.suspense || e.state.status !== "error") && ut(e, i);
}
function ut(e, t) {
  return G(t.enabled, e) !== !1 && e.isStaleByTime(K(t.staleTime, e));
}
function Rn(e, t) {
  return !Oe(e.getCurrentResult(), t);
}
function Lt(e) {
  return {
    onFetch: (t, i) => {
      const n = t.options, r = t.fetchOptions?.meta?.fetchMore?.direction, s = t.state.data?.pages || [], a = t.state.data?.pageParams || [];
      let l = { pages: [], pageParams: [] }, u = 0;
      const c = async () => {
        let h = !1;
        const d = (v) => {
          bn(
            v,
            () => t.signal,
            () => h = !0
          );
        }, p = vi(t.options, t.fetchOptions), m = async (v, _, b) => {
          if (h)
            return Promise.reject();
          if (_ == null && v.pages.length)
            return Promise.resolve(v);
          const y = (() => {
            const L = {
              client: t.client,
              queryKey: t.queryKey,
              pageParam: _,
              direction: b ? "backward" : "forward",
              meta: t.options.meta
            };
            return d(L), L;
          })(), T = await p(y), { maxPages: P } = t.options, A = b ? vn : _n;
          return {
            pages: A(v.pages, T, P),
            pageParams: A(v.pageParams, _, P)
          };
        };
        if (r && s.length) {
          const v = r === "backward", _ = v ? On : Ut, b = {
            pages: s,
            pageParams: a
          }, g = _(n, b);
          l = await m(b, g, v);
        } else {
          const v = e ?? s.length;
          do {
            const _ = u === 0 ? a[0] ?? n.initialPageParam : Ut(n, l);
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
function Ut(e, { pages: t, pageParams: i }) {
  const n = t.length - 1;
  return t.length > 0 ? e.getNextPageParam(
    t[n],
    t,
    i[n],
    i
  ) : void 0;
}
function On(e, { pages: t, pageParams: i }) {
  return t.length > 0 ? e.getPreviousPageParam?.(t[0], t, i[0], i) : void 0;
}
var Pn = class extends Si {
  #e;
  #t;
  #i;
  #r;
  constructor(e) {
    super(), this.#e = e.client, this.mutationId = e.mutationId, this.#i = e.mutationCache, this.#t = [], this.state = e.state || xi(), this.setOptions(e.options), this.scheduleGc();
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
    this.#r = wi({
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
    this.state = t(this.state), M.batch(() => {
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
function xi() {
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
var Dn = class extends se {
  constructor(e = {}) {
    super(), this.config = e, this.#e = /* @__PURE__ */ new Set(), this.#t = /* @__PURE__ */ new Map(), this.#i = 0;
  }
  #e;
  #t;
  #i;
  build(e, t, i) {
    const n = new Pn({
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
    const t = _e(e);
    if (typeof t == "string") {
      const i = this.#t.get(t);
      i ? i.push(e) : this.#t.set(t, [e]);
    }
    this.notify({ type: "added", mutation: e });
  }
  remove(e) {
    if (this.#e.delete(e)) {
      const t = _e(e);
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
    const t = _e(e);
    if (typeof t == "string") {
      const n = this.#t.get(t)?.find(
        (r) => r.state.status === "pending"
      );
      return !n || n === e;
    } else
      return !0;
  }
  runNext(e) {
    const t = _e(e);
    return typeof t == "string" ? this.#t.get(t)?.find((n) => n !== e && n.state.isPaused)?.continue() ?? Promise.resolve() : Promise.resolve();
  }
  clear() {
    M.batch(() => {
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
      (i) => Rt(t, i)
    );
  }
  findAll(e = {}) {
    return this.getAll().filter((t) => Rt(e, t));
  }
  notify(e) {
    M.batch(() => {
      this.listeners.forEach((t) => {
        t(e);
      });
    });
  }
  resumePausedMutations() {
    const e = this.getAll().filter((t) => t.state.isPaused);
    return M.batch(
      () => Promise.all(
        e.map((t) => t.continue().catch($))
      )
    );
  }
};
function _e(e) {
  return e.options.scope?.id;
}
var Fn = class extends se {
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
    this.options = this.#e.defaultMutationOptions(e), Oe(this.options, t) || this.#e.getMutationCache().notify({
      type: "observerOptionsUpdated",
      mutation: this.#i,
      observer: this
    }), t?.mutationKey && this.options.mutationKey && ee(t.mutationKey) !== ee(this.options.mutationKey) ? this.reset() : this.#i?.state.status === "pending" && this.#i.setOptions(this.options);
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
    const e = this.#i?.state ?? xi();
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
    M.batch(() => {
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
}, Mn = class extends se {
  constructor(e = {}) {
    super(), this.config = e, this.#e = /* @__PURE__ */ new Map();
  }
  #e;
  build(e, t, i) {
    const n = t.queryKey, r = t.queryHash ?? at(n, t);
    let s = this.get(r);
    return s || (s = new kn({
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
    M.batch(() => {
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
      (i) => It(t, i)
    );
  }
  findAll(e = {}) {
    const t = this.getAll();
    return Object.keys(e).length > 0 ? t.filter((i) => It(e, i)) : t;
  }
  notify(e) {
    M.batch(() => {
      this.listeners.forEach((t) => {
        t(e);
      });
    });
  }
  onFocus() {
    M.batch(() => {
      this.getAll().forEach((e) => {
        e.onFocus();
      });
    });
  }
  onOnline() {
    M.batch(() => {
      this.getAll().forEach((e) => {
        e.onOnline();
      });
    });
  }
}, An = class {
  #e;
  #t;
  #i;
  #r;
  #n;
  #o;
  #a;
  #s;
  constructor(e = {}) {
    this.#e = e.queryCache || new Mn(), this.#t = e.mutationCache || new Dn(), this.#i = e.defaultOptions || {}, this.#r = /* @__PURE__ */ new Map(), this.#n = /* @__PURE__ */ new Map(), this.#o = 0;
  }
  mount() {
    this.#o++, this.#o === 1 && (this.#a = dt.subscribe(async (e) => {
      e && (await this.resumePausedMutations(), this.#e.onFocus());
    }), this.#s = Pe.subscribe(async (e) => {
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
    return n === void 0 ? this.fetchQuery(e) : (e.revalidateIfStale && i.isStaleByTime(K(t.staleTime, i)) && this.prefetchQuery(t), Promise.resolve(n));
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
    )?.state.data, a = mn(t, s);
    if (a !== void 0)
      return this.#e.build(this, n).setData(a, { ...i, manual: !0 });
  }
  setQueriesData(e, t, i) {
    return M.batch(
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
    M.batch(() => {
      t.findAll(e).forEach((i) => {
        t.remove(i);
      });
    });
  }
  resetQueries(e, t) {
    const i = this.#e;
    return M.batch(() => (i.findAll(e).forEach((n) => {
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
    const i = { revert: !0, ...t }, n = M.batch(
      () => this.#e.findAll(e).map((r) => r.cancel(i))
    );
    return Promise.all(n).then($).catch($);
  }
  invalidateQueries(e, t = {}) {
    return M.batch(() => (this.#e.findAll(e).forEach((i) => {
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
    }, n = M.batch(
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
      K(t.staleTime, i)
    ) ? i.fetch(t) : Promise.resolve(i.state.data);
  }
  prefetchQuery(e) {
    return this.fetchQuery(e).then($).catch($);
  }
  fetchInfiniteQuery(e) {
    return e.behavior = Lt(e.pages), this.fetchQuery(e);
  }
  prefetchInfiniteQuery(e) {
    return this.fetchInfiniteQuery(e).then($).catch($);
  }
  ensureInfiniteQueryData(e) {
    return e.behavior = Lt(e.pages), this.ensureQueryData(e);
  }
  resumePausedMutations() {
    return Pe.isOnline() ? this.#t.resumePausedMutations() : Promise.resolve();
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
    this.#r.set(ee(e), {
      queryKey: e,
      defaultOptions: t
    });
  }
  getQueryDefaults(e) {
    const t = [...this.#r.values()], i = {};
    return t.forEach((n) => {
      ue(e, n.queryKey) && Object.assign(i, n.defaultOptions);
    }), i;
  }
  setMutationDefaults(e, t) {
    this.#n.set(ee(e), {
      mutationKey: e,
      defaultOptions: t
    });
  }
  getMutationDefaults(e) {
    const t = [...this.#n.values()], i = {};
    return t.forEach((n) => {
      ue(e, n.mutationKey) && Object.assign(i, n.defaultOptions);
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
    return t.queryHash || (t.queryHash = at(
      t.queryKey,
      t
    )), t.refetchOnReconnect === void 0 && (t.refetchOnReconnect = t.networkMode !== "always"), t.throwOnError === void 0 && (t.throwOnError = !!t.suspense), !t.networkMode && t.persister && (t.networkMode = "offlineFirst"), t.queryFn === lt && (t.enabled = !1), t;
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
}, te, O, ze, Ht, De = 0, Ci = [], F = w, zt = F.__b, $t = F.__r, Nt = F.diffed, Bt = F.__c, Gt = F.unmount, Qt = F.__;
function fe(e, t) {
  F.__h && F.__h(O, e, De || t), De = 0;
  var i = O.__H || (O.__H = { __: [], __h: [] });
  return e >= i.__.length && i.__.push({}), i.__[e];
}
function C(e) {
  return De = 1, Ln(ki, e);
}
function Ln(e, t, i) {
  var n = fe(te++, 2);
  if (n.t = e, !n.__c && (n.__ = [i ? i(t) : ki(void 0, t), function(l) {
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
function H(e, t) {
  var i = fe(te++, 3);
  !F.__s && ft(i.__H, t) && (i.__ = e, i.u = t, O.__H.__h.push(i));
}
function Un(e, t) {
  var i = fe(te++, 4);
  !F.__s && ft(i.__H, t) && (i.__ = e, i.u = t, O.__h.push(i));
}
function Hn(e, t) {
  var i = fe(te++, 7);
  return ft(i.__H, t) && (i.__ = e(), i.__H = t, i.__h = e), i.__;
}
function J(e, t) {
  return De = 8, Hn(function() {
    return e;
  }, t);
}
function ht(e) {
  var t = O.context[e.__c], i = fe(te++, 9);
  return i.c = e, t ? (i.__ == null && (i.__ = !0, t.sub(O)), t.props.value) : e.__;
}
function zn() {
  for (var e; e = Ci.shift(); ) if (e.__P && e.__H) try {
    e.__H.__h.forEach(Ce), e.__H.__h.forEach(et), e.__H.__h = [];
  } catch (t) {
    e.__H.__h = [], F.__e(t, e.__v);
  }
}
F.__b = function(e) {
  O = null, zt && zt(e);
}, F.__ = function(e, t) {
  e && t.__k && t.__k.__m && (e.__m = t.__k.__m), Qt && Qt(e, t);
}, F.__r = function(e) {
  $t && $t(e), te = 0;
  var t = (O = e.__c).__H;
  t && (ze === O ? (t.__h = [], O.__h = [], t.__.forEach(function(i) {
    i.__N && (i.__ = i.__N), i.u = i.__N = void 0;
  })) : (t.__h.forEach(Ce), t.__h.forEach(et), t.__h = [], te = 0)), ze = O;
}, F.diffed = function(e) {
  Nt && Nt(e);
  var t = e.__c;
  t && t.__H && (t.__H.__h.length && (Ci.push(t) !== 1 && Ht === F.requestAnimationFrame || ((Ht = F.requestAnimationFrame) || $n)(zn)), t.__H.__.forEach(function(i) {
    i.u && (i.__H = i.u), i.u = void 0;
  })), ze = O = null;
}, F.__c = function(e, t) {
  t.some(function(i) {
    try {
      i.__h.forEach(Ce), i.__h = i.__h.filter(function(n) {
        return !n.__ || et(n);
      });
    } catch (n) {
      t.some(function(r) {
        r.__h && (r.__h = []);
      }), t = [], F.__e(n, i.__v);
    }
  }), Bt && Bt(e, t);
}, F.unmount = function(e) {
  Gt && Gt(e);
  var t, i = e.__c;
  i && i.__H && (i.__H.__.forEach(function(n) {
    try {
      Ce(n);
    } catch (r) {
      t = r;
    }
  }), i.__H = void 0, t && F.__e(t, i.__v));
};
var Wt = typeof requestAnimationFrame == "function";
function $n(e) {
  var t, i = function() {
    clearTimeout(n), Wt && cancelAnimationFrame(t), setTimeout(e);
  }, n = setTimeout(i, 35);
  Wt && (t = requestAnimationFrame(i));
}
function Ce(e) {
  var t = O, i = e.__c;
  typeof i == "function" && (e.__c = void 0, i()), O = t;
}
function et(e) {
  var t = O;
  e.__c = e.__(), O = t;
}
function ft(e, t) {
  return !e || e.length !== t.length || t.some(function(i, n) {
    return i !== e[n];
  });
}
function ki(e, t) {
  return typeof t == "function" ? t(e) : t;
}
function Nn(e, t) {
  for (var i in t) e[i] = t[i];
  return e;
}
function jt(e, t) {
  for (var i in e) if (i !== "__source" && !(i in t)) return !0;
  for (var n in t) if (n !== "__source" && e[n] !== t[n]) return !0;
  return !1;
}
function Ti(e, t) {
  var i = t(), n = C({ t: { __: i, u: t } }), r = n[0].t, s = n[1];
  return Un(function() {
    r.__ = i, r.u = t, $e(r) && s({ t: r });
  }, [e, i, t]), H(function() {
    return $e(r) && s({ t: r }), e(function() {
      $e(r) && s({ t: r });
    });
  }, [e]), i;
}
function $e(e) {
  var t, i, n = e.u, r = e.__;
  try {
    var s = n();
    return !((t = r) === (i = s) && (t !== 0 || 1 / t == 1 / i) || t != t && i != i);
  } catch {
    return !0;
  }
}
function Kt(e, t) {
  this.props = e, this.context = t;
}
(Kt.prototype = new j()).isPureReactComponent = !0, Kt.prototype.shouldComponentUpdate = function(e, t) {
  return jt(this.props, e) || jt(this.state, t);
};
var qt = w.__b;
w.__b = function(e) {
  e.type && e.type.__f && e.ref && (e.props.ref = e.ref, e.ref = null), qt && qt(e);
};
var Bn = w.__e;
w.__e = function(e, t, i, n) {
  if (e.then) {
    for (var r, s = t; s = s.__; ) if ((r = s.__c) && r.__c) return t.__e == null && (t.__e = i.__e, t.__k = i.__k), r.__c(e, t);
  }
  Bn(e, t, i, n);
};
var Vt = w.unmount;
function Ii(e, t, i) {
  return e && (e.__c && e.__c.__H && (e.__c.__H.__.forEach(function(n) {
    typeof n.__c == "function" && n.__c();
  }), e.__c.__H = null), (e = Nn({}, e)).__c != null && (e.__c.__P === i && (e.__c.__P = t), e.__c.__e = !0, e.__c = null), e.__k = e.__k && e.__k.map(function(n) {
    return Ii(n, t, i);
  })), e;
}
function Ri(e, t, i) {
  return e && i && (e.__v = null, e.__k = e.__k && e.__k.map(function(n) {
    return Ri(n, t, i);
  }), e.__c && e.__c.__P === t && (e.__e && i.appendChild(e.__e), e.__c.__e = !0, e.__c.__P = i)), e;
}
function Ne() {
  this.__u = 0, this.o = null, this.__b = null;
}
function Oi(e) {
  if (!e.__) return null;
  var t = e.__.__c;
  return t && t.__a && t.__a(e);
}
function ve() {
  this.i = null, this.l = null;
}
w.unmount = function(e) {
  var t = e.__c;
  t && (t.__z = !0), t && t.__R && t.__R(), t && 32 & e.__u && (e.type = null), Vt && Vt(e);
}, (Ne.prototype = new j()).__c = function(e, t) {
  var i = t.__c, n = this;
  n.o == null && (n.o = []), n.o.push(i);
  var r = Oi(n.__v), s = !1, a = function() {
    s || n.__z || (s = !0, i.__R = null, r ? r(u) : u());
  };
  i.__R = a;
  var l = i.__P;
  i.__P = null;
  var u = function() {
    if (!--n.__u) {
      if (n.state.__a) {
        var c = n.state.__a;
        n.__v.__k[0] = Ri(c, c.__c.__P, c.__c.__O);
      }
      var h;
      for (n.setState({ __a: n.__b = null }); h = n.o.pop(); ) h.__P = l, h.forceUpdate();
    }
  };
  n.__u++ || 32 & t.__u || n.setState({ __a: n.__b = n.__v.__k[0] }), e.then(a, a);
}, Ne.prototype.componentWillUnmount = function() {
  this.o = [];
}, Ne.prototype.render = function(e, t) {
  if (this.__b) {
    if (this.__v.__k) {
      var i = document.createElement("div"), n = this.__v.__k[0].__c;
      this.__v.__k[0] = Ii(this.__b, i, n.__O = n.__P);
    }
    this.__b = null;
  }
  var r = t.__a && We(V, null, e.fallback);
  return r && (r.__u &= -33), [We(V, null, t.__a ? null : e.children), r];
};
var Yt = function(e, t, i) {
  if (++i[1] === i[0] && e.l.delete(t), e.props.revealOrder && (e.props.revealOrder[0] !== "t" || !e.l.size)) for (i = e.i; i; ) {
    for (; i.length > 3; ) i.pop()();
    if (i[1] < i[0]) break;
    e.i = i = i[2];
  }
};
(ve.prototype = new j()).__a = function(e) {
  var t = this, i = Oi(t.__v), n = t.l.get(e);
  return n[0]++, function(r) {
    var s = function() {
      t.props.revealOrder ? (n.push(r), Yt(t, e, n)) : r();
    };
    i ? i(s) : s();
  };
}, ve.prototype.render = function(e) {
  this.i = null, this.l = /* @__PURE__ */ new Map();
  var t = Re(e.children);
  e.revealOrder && e.revealOrder[0] === "b" && t.reverse();
  for (var i = t.length; i--; ) this.l.set(t[i], this.i = [1, 0, this.i]);
  return e.children;
}, ve.prototype.componentDidUpdate = ve.prototype.componentDidMount = function() {
  var e = this;
  this.l.forEach(function(t, i) {
    Yt(e, i, t);
  });
};
var Gn = typeof Symbol < "u" && Symbol.for && /* @__PURE__ */ Symbol.for("react.element") || 60103, Qn = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, Wn = /^on(Ani|Tra|Tou|BeforeInp|Compo)/, jn = /[A-Z0-9]/g, Kn = typeof document < "u", qn = function(e) {
  return (typeof Symbol < "u" && typeof /* @__PURE__ */ Symbol() == "symbol" ? /fil|che|rad/ : /fil|che|ra/).test(e);
};
j.prototype.isReactComponent = {}, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(e) {
  Object.defineProperty(j.prototype, e, { configurable: !0, get: function() {
    return this["UNSAFE_" + e];
  }, set: function(t) {
    Object.defineProperty(this, e, { configurable: !0, writable: !0, value: t });
  } });
});
var Xt = w.event;
function Vn() {
}
function Yn() {
  return this.cancelBubble;
}
function Xn() {
  return this.defaultPrevented;
}
w.event = function(e) {
  return Xt && (e = Xt(e)), e.persist = Vn, e.isPropagationStopped = Yn, e.isDefaultPrevented = Xn, e.nativeEvent = e;
};
var Jn = { enumerable: !1, configurable: !0, get: function() {
  return this.class;
} }, Jt = w.vnode;
w.vnode = function(e) {
  typeof e.type == "string" && (function(t) {
    var i = t.props, n = t.type, r = {}, s = n.indexOf("-") === -1;
    for (var a in i) {
      var l = i[a];
      if (!(a === "value" && "defaultValue" in i && l == null || Kn && a === "children" && n === "noscript" || a === "class" || a === "className")) {
        var u = a.toLowerCase();
        a === "defaultValue" && "value" in i && i.value == null ? a = "value" : a === "download" && l === !0 ? l = "" : u === "translate" && l === "no" ? l = !1 : u[0] === "o" && u[1] === "n" ? u === "ondoubleclick" ? a = "ondblclick" : u !== "onchange" || n !== "input" && n !== "textarea" || qn(i.type) ? u === "onfocus" ? a = "onfocusin" : u === "onblur" ? a = "onfocusout" : Wn.test(a) && (a = u) : u = a = "oninput" : s && Qn.test(a) ? a = a.replace(jn, "-$&").toLowerCase() : l === null && (l = void 0), u === "oninput" && r[a = u] && (a = "oninputCapture"), r[a] = l;
      }
    }
    n == "select" && r.multiple && Array.isArray(r.value) && (r.value = Re(i.children).forEach(function(c) {
      c.props.selected = r.value.indexOf(c.props.value) != -1;
    })), n == "select" && r.defaultValue != null && (r.value = Re(i.children).forEach(function(c) {
      c.props.selected = r.multiple ? r.defaultValue.indexOf(c.props.value) != -1 : r.defaultValue == c.props.value;
    })), i.class && !i.className ? (r.class = i.class, Object.defineProperty(r, "className", Jn)) : (i.className && !i.class || i.class && i.className) && (r.class = r.className = i.className), t.props = r;
  })(e), e.$$typeof = Gn, Jt && Jt(e);
};
var Zt = w.__r;
w.__r = function(e) {
  Zt && Zt(e), e.__c;
};
var ei = w.diffed;
w.diffed = function(e) {
  ei && ei(e);
  var t = e.props, i = e.__e;
  i != null && e.type === "textarea" && "value" in t && t.value !== i.value && (i.value = t.value == null ? "" : t.value);
};
var Pi = ot(
  void 0
), pt = (e) => {
  const t = ht(Pi);
  if (!t)
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  return t;
}, Zn = ({
  client: e,
  children: t
}) => (H(() => (e.mount(), () => {
  e.unmount();
}), [e]), /* @__PURE__ */ o(Pi.Provider, { value: e, children: t })), Di = ot(!1), er = () => ht(Di);
Di.Provider;
function tr() {
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
var ir = ot(tr()), nr = () => ht(ir), rr = (e, t, i) => {
  const n = i?.state.error && typeof e.throwOnError == "function" ? ct(e.throwOnError, [i.state.error, i]) : e.throwOnError;
  (e.suspense || e.experimental_prefetchInRender || n) && (t.isReset() || (e.retryOnMount = !1));
}, sr = (e) => {
  H(() => {
    e.clearReset();
  }, [e]);
}, or = ({
  result: e,
  errorResetBoundary: t,
  throwOnError: i,
  query: n,
  suspense: r
}) => e.isError && !t.isReset() && !e.isFetching && n && (r && e.data === void 0 || ct(i, [e.error, n])), ar = (e) => {
  if (e.suspense) {
    const i = (r) => r === "static" ? r : Math.max(r ?? 1e3, 1e3), n = e.staleTime;
    e.staleTime = typeof n == "function" ? (...r) => i(n(...r)) : i(n), typeof e.gcTime == "number" && (e.gcTime = Math.max(
      e.gcTime,
      1e3
    ));
  }
}, lr = (e, t) => e.isLoading && e.isFetching && !t, cr = (e, t) => e?.suspense && t.isPending, ti = (e, t, i) => t.fetchOptimistic(e).catch(() => {
  i.clearReset();
});
function dr(e, t, i) {
  const n = er(), r = nr(), s = pt(), a = s.defaultQueryOptions(e);
  s.getDefaultOptions().queries?._experimental_beforeQuery?.(
    a
  );
  const l = s.getQueryCache().get(a.queryHash);
  a._optimisticResults = n ? "isRestoring" : "optimistic", ar(a), rr(a, r, l), sr(r);
  const u = !s.getQueryCache().get(a.queryHash), [c] = C(
    () => new t(
      s,
      a
    )
  ), h = c.getOptimisticResult(a), d = !n && e.subscribed !== !1;
  if (Ti(
    J(
      (p) => {
        const m = d ? c.subscribe(M.batchCalls(p)) : $;
        return c.updateResult(), m;
      },
      [c, d]
    ),
    () => c.getCurrentResult()
  ), H(() => {
    c.setOptions(a);
  }, [a, c]), cr(a, h))
    throw ti(a, c, r);
  if (or({
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
  ), a.experimental_prefetchInRender && !Z && lr(h, n) && (u ? (
    // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
    ti(a, c, r)
  ) : (
    // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
    l?.promise
  ))?.catch($).finally(() => {
    c.updateResult();
  }), a.notifyOnChangeProps ? h : c.trackResult(h);
}
function Fi(e, t) {
  return dr(e, Tn);
}
function mt(e, t) {
  const i = pt(), [n] = C(
    () => new Fn(
      i,
      e
    )
  );
  H(() => {
    n.setOptions(e);
  }, [n, e]);
  const r = Ti(
    J(
      (a) => n.subscribe(M.batchCalls(a)),
      [n]
    ),
    () => n.getCurrentResult()
  ), s = J(
    (a, l) => {
      n.mutate(a, l).catch($);
    },
    [n]
  );
  if (r.error && ct(n.options.throwOnError, [r.error]))
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
}, ur = `
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
function ke({
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
function Mi({
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
const hr = ["top", "right", "bottom", "left"];
function fr({ onMessage: e, elementSelected: t }) {
  const [i, n] = C(""), [r, s] = C(null), [a, l] = C(""), [u, c] = C("right"), [h, d] = C(""), [p, m] = C(!1);
  H(() => {
    e({ type: "EDITOR_READY" });
  }, []), H(() => {
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
        page: Te(),
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
          Mi,
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
        /* @__PURE__ */ o("div", { style: f.placementGrid, children: hr.map((g) => /* @__PURE__ */ o(
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
const pr = "https://devgw.revgain.ai/rg-pex", Ai = "designerIud";
function mr() {
  if (typeof window > "u") return null;
  try {
    return localStorage.getItem(Ai);
  } catch {
    return null;
  }
}
function be(e) {
  const t = {
    "Content-Type": "application/json",
    ...e
  }, i = mr();
  return i && (t.iud = i), t;
}
const oe = {
  baseUrl: pr,
  async get(e, t) {
    const i = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, n = await fetch(i, {
      ...t,
      headers: { ...be(), ...t?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  },
  async post(e, t, i) {
    const n = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, r = await fetch(n, {
      method: "POST",
      ...i,
      headers: { ...be(), ...i?.headers },
      body: t !== void 0 ? JSON.stringify(t) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async put(e, t, i) {
    const n = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, r = await fetch(n, {
      method: "PUT",
      ...i,
      headers: { ...be(), ...i?.headers },
      body: t !== void 0 ? JSON.stringify(t) : void 0
    });
    if (!r.ok) throw new Error(`API error: ${r.status} ${r.statusText}`);
    return r.json();
  },
  async delete(e, t) {
    const i = e.startsWith("http") ? e : `${this.baseUrl}${e.startsWith("/") ? "" : "/"}${e}`, n = await fetch(i, {
      method: "DELETE",
      ...t,
      headers: { ...be(), ...t?.headers }
    });
    if (!n.ok) throw new Error(`API error: ${n.status} ${n.statusText}`);
    return n.json();
  }
}, gr = ["pages", "create"];
async function yr(e) {
  return oe.post("/pages", {
    name: e.name,
    slug: e.slug,
    description: e.description,
    status: "active"
  });
}
function _r() {
  return mt({
    mutationKey: gr,
    mutationFn: yr
  });
}
const vr = ["pages", "update"];
async function br({ pageId: e, payload: t }) {
  return oe.put(`/pages/${e}`, {
    name: t.name,
    slug: t.slug,
    description: t.description,
    status: t.status ?? "active"
  });
}
function wr() {
  return mt({
    mutationKey: vr,
    mutationFn: br
  });
}
const Sr = ["pages", "delete"];
async function Er(e) {
  return oe.delete(`/pages/${e}`);
}
function xr() {
  return mt({
    mutationKey: Sr,
    mutationFn: Er
  });
}
const Cr = (e) => ["pages", "check-slug", e];
async function kr(e) {
  return oe.get(`/pages/check-slug?slug=${encodeURIComponent(e)}`);
}
function Tr(e) {
  return Fi({
    queryKey: Cr(e),
    queryFn: () => kr(e),
    enabled: !!e,
    retry: 0
  });
}
const Ir = ["pages", "list"];
async function Rr() {
  return oe.get("/pages");
}
function Or() {
  return Fi({
    queryKey: Ir,
    queryFn: Rr,
    retry: 0
  });
}
const Pr = "designerTaggedPages", we = ["pages", "check-slug"], Be = ["pages", "list"];
function Se() {
  try {
    const t = (typeof window < "u" && window.parent !== window ? window.parent : window).location;
    return (t.host || t.hostname || "") + (t.pathname || "/") + (t.search || "") + (t.hash || "");
  } catch {
    return typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href || "";
  }
}
function Ee() {
  try {
    const t = (typeof window < "u" && window.parent !== window ? window.parent : window).location, i = (t.pathname || "/").replace(/^\//, ""), n = t.search || "", r = t.hash || "";
    return "//*/" + i + n + r;
  } catch {
    return "//*/";
  }
}
function Dr({ onMessage: e }) {
  const [t, i] = C("overviewUntagged"), [n, r] = C(""), [s, a] = C(""), [l, u] = C(""), [c, h] = C(!1), [d, p] = C("create"), [m, v] = C(""), [_, b] = C(""), [g, y] = C("suggested"), [T, P] = C(""), [A, L] = C(!1), [D, k] = C(null), [U, N] = C(!1), R = pt(), S = _r(), B = wr(), pe = xr(), { data: Me, isLoading: $i, isError: gt } = Tr(n), { data: Ni, isLoading: yt } = Or(), Ae = !!n && $i, Le = S.isPending || B.isPending, Bi = (n || "").trim().toLowerCase(), _t = (Ni?.data ?? []).filter((x) => (x.slug || "").trim().toLowerCase() === Bi).filter(
    (x) => (x.name || "").toLowerCase().includes(l.toLowerCase().trim())
  ), me = J(() => {
    i("overviewUntagged"), a(Se() || "(current page)"), h(!1), R.invalidateQueries({ queryKey: we });
  }, [R]), Gi = J(() => {
    i("taggedPagesDetailView"), u("");
  }, []), Ue = J(() => {
    k(null), i("tagPageFormView"), h(!0), P(Ee()), v(""), b(""), p("create"), y("suggested"), L(!1);
  }, []), Qi = J((x) => {
    k(x.page_id), i("tagPageFormView"), h(!0), P(x.slug || Ee()), v(x.name || ""), b(x.description || ""), p("create"), y("suggested"), L(!1);
  }, []);
  H(() => {
    e({ type: "EDITOR_READY" });
  }, []), H(() => {
    r(Ee()), a(Se() || "(current page)");
  }, []), H(() => {
    if (!n) {
      i("overviewUntagged");
      return;
    }
    if (gt) {
      (t === "overviewTagged" || t === "overviewUntagged") && i("overviewUntagged");
      return;
    }
    Me !== void 0 && (t === "overviewTagged" || t === "overviewUntagged") && i(Me.exists ? "overviewTagged" : "overviewUntagged");
  }, [n, Me, gt, t]), H(() => {
    let x = Se();
    const le = () => {
      const ie = Se();
      ie !== x && (x = ie, r(Ee()), a(ie || "(current page)"), i("overviewUntagged"));
    }, ce = () => le(), ge = () => le();
    window.addEventListener("hashchange", ce), window.addEventListener("popstate", ge);
    const He = setInterval(le, 1500);
    return () => {
      window.removeEventListener("hashchange", ce), window.removeEventListener("popstate", ge), clearInterval(He);
    };
  }, []);
  const Wi = async () => {
    const x = m.trim();
    if (!x) {
      L(!0);
      return;
    }
    L(!1);
    const le = typeof window < "u" && window.parent !== window ? window.parent.location.pathname : window.location.pathname, ce = T.trim() || le || "/";
    try {
      if (D)
        await B.mutateAsync({
          pageId: D,
          payload: {
            name: x,
            slug: ce,
            description: _.trim() || void 0,
            status: "active"
          }
        }), k(null), R.invalidateQueries({ queryKey: we }), R.invalidateQueries({ queryKey: Be }), me();
      else {
        const ge = typeof window < "u" && window.parent !== window ? window.parent.location.href : window.location.href, He = T.trim() || ge;
        await S.mutateAsync({
          name: x,
          slug: ce,
          description: _.trim() || void 0
        });
        const ie = Pr, Ki = localStorage.getItem(ie) || "[]", vt = JSON.parse(Ki);
        vt.push({ pageName: x, url: He }), localStorage.setItem(ie, JSON.stringify(vt)), R.invalidateQueries({ queryKey: we }), R.invalidateQueries({ queryKey: Be });
      }
    } catch {
    }
  }, ji = async (x) => {
    if (window.confirm("Delete this page?"))
      try {
        await pe.mutateAsync(x), R.invalidateQueries({ queryKey: we }), R.invalidateQueries({ queryKey: Be });
      } catch {
      }
  }, ae = { display: "flex", flexDirection: "column", flex: 1, gap: "1rem" };
  return U ? /* @__PURE__ */ o("div", { style: { ...f.panel, padding: "0.5rem" }, children: /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
    /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
    /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(I, { variant: "icon", title: "Expand", onClick: () => N(!1), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:plus", style: { fontSize: "1.25rem", color: "#64748b" } }) }) })
  ] }) }) : /* @__PURE__ */ o("div", { style: f.panel, children: [
    /* @__PURE__ */ o("div", { style: f.panelHeader, children: [
      /* @__PURE__ */ o("h2", { style: { ...f.headerTitle, fontSize: "1.125rem" }, children: "Tag Page" }),
      /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: /* @__PURE__ */ o(I, { variant: "icon", title: "Minimize", onClick: () => N(!0), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:window-minimize", style: { fontSize: "1.125rem" } }) }) })
    ] }),
    /* @__PURE__ */ o("div", { style: f.panelBody, children: [
      Ae && (t === "overviewTagged" || t === "overviewUntagged") && /* @__PURE__ */ o("div", { style: { ...ae, alignItems: "center", justifyContent: "center", padding: "2rem", color: "#64748b", fontSize: "0.875rem" }, children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.5rem", marginBottom: "0.5rem" } }),
        /* @__PURE__ */ o("span", { children: "Checking page…" })
      ] }),
      !Ae && t === "overviewTagged" && /* @__PURE__ */ o("div", { style: ae, children: [
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
        /* @__PURE__ */ o(I, { variant: "primary", style: { width: "100%" }, onClick: Ue, children: "Tag Page" })
      ] }),
      t === "taggedPagesDetailView" && /* @__PURE__ */ o("div", { style: ae, children: [
        /* @__PURE__ */ o(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (x) => {
              x.preventDefault(), me();
            },
            children: [
              /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
              " Back to overview"
            ]
          }
        ),
        /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }, children: [
          /* @__PURE__ */ o("span", { style: { ...f.badge, background: "#3b82f6", color: "#fff", minWidth: "1.5rem", height: "1.5rem" }, children: yt ? "…" : _t.length }),
          /* @__PURE__ */ o("h3", { style: { fontSize: "1rem", fontWeight: 700, color: "#1e293b" }, children: "Current URL" })
        ] }),
        /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }, children: "List of tagged Pages on this URL" }),
        /* @__PURE__ */ o("div", { style: f.searchWrap, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:magnify", style: f.searchIcon }),
          /* @__PURE__ */ o(
            ke,
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
        yt ? /* @__PURE__ */ o("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.25rem", marginRight: "0.5rem" } }),
          /* @__PURE__ */ o("span", { children: "Loading pages…" })
        ] }) : _t.map((x) => /* @__PURE__ */ o("div", { style: { ...f.pageItem, marginBottom: "0.5rem", alignItems: "center" }, children: [
          /* @__PURE__ */ o("span", { style: { fontSize: "0.875rem", fontWeight: 500, color: "#1e293b", flex: 1 }, children: x.name || "Unnamed" }),
          /* @__PURE__ */ o("div", { style: { display: "flex", gap: "0.25rem" }, children: [
            /* @__PURE__ */ o(I, { variant: "iconSm", title: "Edit", onClick: () => Qi(x), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:pencil" }) }),
            /* @__PURE__ */ o(I, { variant: "iconSm", title: "Delete", onClick: () => ji(x.page_id), children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:delete-outline" }) })
          ] })
        ] }, x.page_id)),
        /* @__PURE__ */ o(I, { variant: "primary", style: { width: "100%", marginTop: "1rem" }, onClick: Ue, children: "Tag Page" })
      ] }),
      !Ae && t === "overviewUntagged" && /* @__PURE__ */ o("div", { style: { ...ae, textAlign: "center", padding: "2.5rem 1.5rem" }, children: [
        /* @__PURE__ */ o("div", { style: { ...f.emptyStateIcon, width: "6rem", height: "6rem", marginBottom: "1.5rem", background: "linear-gradient(to bottom right, #dbeafe, #bfdbfe, #93c5fd)" }, children: /* @__PURE__ */ o("iconify-icon", { icon: "mdi:tag-plus", style: { fontSize: "3rem", color: "#3b82f6" } }) }),
        /* @__PURE__ */ o("h3", { style: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }, children: "Let's start tagging!" }),
        /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.625, maxWidth: "20rem", margin: "0 auto 2rem" }, children: "Start by first tagging this page and then features to get going." }),
        /* @__PURE__ */ o(I, { variant: "primary", style: { width: "100%", maxWidth: "20rem", margin: "0 auto" }, onClick: Ue, children: "Tag Page" })
      ] }),
      t === "tagPageFormView" && /* @__PURE__ */ o("div", { style: { ...ae, gap: "1.5rem" }, children: [
        /* @__PURE__ */ o(
          "a",
          {
            href: "#",
            style: f.link,
            onClick: (x) => {
              x.preventDefault(), k(null), me(), h(!1);
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
                ke,
                {
                  type: "text",
                  placeholder: "Enter page name",
                  value: m,
                  onInput: (x) => v(x.target.value)
                }
              ),
              A && /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#dc2626", marginTop: "0.375rem", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
                /* @__PURE__ */ o("iconify-icon", { icon: "mdi:alert-circle" }),
                " Please enter a page name."
              ] })
            ] }),
            /* @__PURE__ */ o("div", { children: [
              /* @__PURE__ */ o("label", { style: { display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }, children: "Description" }),
              /* @__PURE__ */ o(
                Mi,
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
            /* @__PURE__ */ o(ke, { type: "text", placeholder: "e.g. //*/path/to/page", value: T, onInput: (x) => P(x.target.value) })
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
            k(null), me();
          },
          disabled: Le,
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ o(I, { variant: "primary", style: { flex: 1 }, onClick: Wi, disabled: Le, children: Le ? /* @__PURE__ */ o(V, { children: [
        /* @__PURE__ */ o("iconify-icon", { icon: "mdi:loading", className: "editor-spinner", style: { fontSize: "1.125rem", marginRight: "0.375rem" } }),
        D ? "Updating…" : "Saving…"
      ] }) : D ? "Update" : "Save" })
    ] })
  ] });
}
const Fr = "designerTaggedFeatures", ii = "designerHeatmapEnabled";
function Mr() {
  try {
    const e = window.location;
    return (e.host || e.hostname || "") + (e.pathname || "/") + (e.search || "") + (e.hash || "");
  } catch {
    return window.location.href || "";
  }
}
function ni(e) {
  return (e || "").replace(/^https?:\/\//i, "").replace(/\/$/, "") || "";
}
function Ar() {
  try {
    const e = localStorage.getItem(Fr) || "[]";
    return JSON.parse(e);
  } catch {
    return [];
  }
}
function Lr() {
  const e = ni(Mr());
  return Ar().filter((t) => t && ni(t.url) === e);
}
function Ur({ onMessage: e, elementSelected: t, tagFeatureSavedAckCounter: i }) {
  const [n, r] = C(!1), [s, a] = C(""), [l, u] = C(null), [c, h] = C(""), [d, p] = C(!1), [m, v] = C(0), [_, b] = C(!1), [g, y] = C(!1), [T, P] = C(!1), [A, L] = C(!1), D = () => {
    v(Lr().length);
  }, k = () => {
    r(!1), a(""), u(null), h(""), p(!1), D();
  };
  H(() => {
    e({ type: "EDITOR_READY" });
  }, []), H(() => {
    D();
  }, []), H(() => {
    const S = localStorage.getItem(ii) === "true";
    b(S);
  }, []), H(() => {
    t ? (a(t.selector), u(t.elementInfo), r(!0), h(""), p(!1)) : k();
  }, [t]), H(() => {
    i != null && i > 0 && k();
  }, [i]);
  const U = () => {
    const S = !_;
    b(S);
    try {
      localStorage.setItem(ii, String(S));
    } catch {
    }
    e({ type: "HEATMAP_TOGGLE", enabled: S });
  }, N = () => {
    const S = c.trim();
    if (!S) {
      p(!0);
      return;
    }
    p(!1), e({
      type: "SAVE_TAG_FEATURE",
      payload: {
        featureName: S,
        selector: s,
        elementInfo: l || void 0
      }
    });
  }, R = (S) => {
    const B = [];
    S.tagName && B.push(`Tag: ${S.tagName}`), S.id && B.push(`ID: ${S.id}`), S.className && B.push(`Class: ${S.className}`);
    const pe = (S.textContent || "").slice(0, 80);
    return pe && B.push(`Text: ${pe}`), B.join(" | ");
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
      /* @__PURE__ */ o("div", { style: { padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }, children: [
        /* @__PURE__ */ o("a", { href: "#", style: f.link, onClick: (S) => {
          S.preventDefault(), k();
        }, children: [
          /* @__PURE__ */ o("iconify-icon", { icon: "mdi:arrow-left" }),
          " Back to overview"
        ] }),
        /* @__PURE__ */ o("h3", { style: { fontSize: "1.125rem", fontWeight: 700, color: "#1e293b" }, children: "Tag Feature" }),
        /* @__PURE__ */ o("div", { style: f.section, children: [
          /* @__PURE__ */ o("label", { style: f.label, children: "Selector" }),
          /* @__PURE__ */ o("div", { style: f.selectorBox, children: s || "-" })
        ] }),
        l && /* @__PURE__ */ o("div", { style: f.section, children: [
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
              onClick: () => L((S) => !S),
              "aria-expanded": A,
              children: [
                /* @__PURE__ */ o("label", { style: { ...f.label, marginBottom: 0, cursor: "pointer" }, children: "Element info" }),
                /* @__PURE__ */ o(
                  "iconify-icon",
                  {
                    icon: A ? "mdi:chevron-up" : "mdi:chevron-down",
                    style: { fontSize: "1.25rem", color: "#64748b", flexShrink: 0 }
                  }
                )
              ]
            }
          ),
          A && /* @__PURE__ */ o("div", { style: { ...f.elementInfo, marginTop: "0.5rem" }, children: /* @__PURE__ */ o("div", { style: f.elementInfoText, children: R(l) }) })
        ] }),
        /* @__PURE__ */ o("div", { style: f.section, children: [
          /* @__PURE__ */ o("label", { style: f.label, children: [
            "Feature Name ",
            /* @__PURE__ */ o("span", { style: { color: "#ef4444" }, children: "*" })
          ] }),
          /* @__PURE__ */ o(
            ke,
            {
              type: "text",
              placeholder: "Enter feature name",
              value: c,
              onInput: (S) => h(S.target.value)
            }
          ),
          d && /* @__PURE__ */ o("p", { style: { fontSize: "0.875rem", color: "#dc2626", display: "flex", alignItems: "center", gap: "0.25rem" }, children: [
            /* @__PURE__ */ o("iconify-icon", { icon: "mdi:alert-circle" }),
            " Please enter a feature name."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ o("div", { style: f.footer, children: [
        /* @__PURE__ */ o(I, { variant: "secondary", onClick: k, children: "Cancel" }),
        /* @__PURE__ */ o(
          I,
          {
            variant: "secondary",
            onClick: () => {
              P(!1), e({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Clear Selection"
          }
        ),
        /* @__PURE__ */ o(I, { variant: "primary", onClick: N, children: "Save" })
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
              onClick: U,
              onKeyDown: (S) => S.key === "Enter" && U(),
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
            variant: T ? "primary" : "secondary",
            style: { flex: 1 },
            onClick: () => {
              P(!0), e({ type: "TAG_FEATURE_CLICKED" });
            },
            children: "Tag Feature"
          }
        ),
        /* @__PURE__ */ o(
          I,
          {
            variant: "secondary",
            style: T ? void 0 : { borderWidth: "2px", borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.08)", color: "#1d4ed8" },
            onClick: () => {
              P(!1), e({ type: "CLEAR_SELECTION_CLICKED" });
            },
            children: "Clear Selection"
          }
        )
      ] })
    ] }) })
  ] });
}
const Hr = new An({
  defaultOptions: { mutations: { retry: 0 } }
});
class zr {
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
    this.elementSelectedState = { selector: t.selector, elementInfo: t.elementInfo }, this.renderEditorContent(), this.show();
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
    const n = (s) => this.messageCallback?.(s), r = this.mode === "tag-page" ? /* @__PURE__ */ o(Dr, { onMessage: n }) : this.mode === "tag-feature" ? /* @__PURE__ */ o(
      Ur,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState,
        tagFeatureSavedAckCounter: this.tagFeatureSavedAckCounter
      }
    ) : /* @__PURE__ */ o(
      fr,
      {
        onMessage: n,
        elementSelected: this.elementSelectedState
      }
    );
    re(
      /* @__PURE__ */ o(Zn, { client: Hr, children: r }),
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
  <style>${ur}</style>
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
const $r = "visual-designer-guides", ri = "1.0.0";
class Nr {
  storageKey;
  constructor(t = $r) {
    this.storageKey = t;
  }
  getGuides() {
    try {
      const t = localStorage.getItem(this.storageKey);
      if (!t) return [];
      const i = JSON.parse(t);
      return i.version !== ri ? (this.clear(), []) : i.guides || [];
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
    const i = { guides: t, version: ri };
    localStorage.setItem(this.storageKey, JSON.stringify(i));
  }
  clear() {
    localStorage.removeItem(this.storageKey);
  }
  getGuide(t) {
    return this.getGuides().find((i) => i.id === t) || null;
  }
}
function Br({ onExit: e }) {
  const t = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    background: E.bg,
    border: `2px solid ${E.primary}`,
    borderRadius: E.borderRadius,
    color: E.primary,
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: E.fontFamily,
    cursor: "pointer",
    zIndex: String(E.zIndex.controls),
    boxShadow: E.shadow,
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
        i.currentTarget.style.background = E.primary, i.currentTarget.style.color = E.bg, i.currentTarget.style.transform = "translateY(-2px)", i.currentTarget.style.boxShadow = E.shadowHover;
      },
      onMouseLeave: (i) => {
        i.currentTarget.style.background = E.bg, i.currentTarget.style.color = E.primary, i.currentTarget.style.transform = "translateY(0)", i.currentTarget.style.boxShadow = E.shadow;
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
        border: `5px solid ${E.primary}`,
        pointerEvents: "none",
        zIndex: E.zIndex.highlight - 1,
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
        background: E.primary,
        color: E.bg,
        fontSize: "14px",
        fontWeight: "600",
        fontFamily: E.fontFamily,
        borderRadius: "0 0 6px 6px",
        border: `5px solid ${E.primary}`,
        borderTop: "none",
        zIndex: E.zIndex.badge,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        pointerEvents: "none",
        whiteSpace: "nowrap"
      },
      children: "Revgain Visual Design Studio"
    }
  );
}
function Wr() {
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
        zIndex: E.zIndex.loading,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: E.fontFamily
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
                    borderTopColor: E.primary,
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
function jr(e) {
  return /* @__PURE__ */ o(V, { children: [
    e.showExitButton && /* @__PURE__ */ o(Br, { onExit: e.onExitEditor }),
    e.showRedBorder && /* @__PURE__ */ o(Gr, {}),
    e.showBadge && /* @__PURE__ */ o(Qr, {}),
    e.showLoading && /* @__PURE__ */ o(Wr, {})
  ] });
}
function Kr(e, t) {
  re(/* @__PURE__ */ o(jr, { ...t }), e);
}
class Li {
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
    this.config = t, this.storage = new Nr(t.storageKey), this.editorMode = new Xi(), this.guideRenderer = new ln(), this.featureHeatmapRenderer = new un(), this.editorFrame = new zr();
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
    return this.storage.getGuidesByPage(Te());
  }
  saveGuide(t) {
    const i = {
      ...t,
      id: wt(),
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
      page: Te()
    });
  }
  handleSaveTagFeature(t) {
    const i = "designerTaggedFeatures", n = t.payload;
    if (!(!n.selector || !n.featureName))
      try {
        const r = localStorage.getItem(i) || "[]", s = JSON.parse(r), a = typeof window < "u" ? window.location.href : "", l = {
          id: wt(),
          featureName: n.featureName,
          selector: n.selector,
          url: a,
          elementInfo: n.elementInfo,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        s.push(l), localStorage.setItem(i, JSON.stringify(s)), this.editorFrame.sendTagFeatureSavedAck(), this.renderFeatureHeatmap();
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
      return JSON.parse(t);
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
    this.ensureSDKRoot(), this.sdkRoot && Kr(this.sdkRoot, {
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
let z = null, Ui = !1;
function q(e) {
  return z || (z = new Li(e), z.init(), z);
}
function Hi() {
  return z;
}
function zi(e) {
  !e || !Array.isArray(e) || e.forEach((t) => {
    if (!t || !Array.isArray(t) || t.length === 0) return;
    const i = t[0], n = t.slice(1);
    try {
      switch (i) {
        case "initialize":
          q(n[0]);
          break;
        case "identify":
          n[0] && console.log("[Visual Designer] identify (snippet) called with:", n[0]);
          break;
        case "enableEditor":
          (z ?? q()).enableEditor();
          break;
        case "disableEditor":
          z?.disableEditor();
          break;
        case "loadGuides":
          z?.loadGuides();
          break;
        case "getGuides":
          return z?.getGuides();
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
  e && Array.isArray(e._q) && (Ui = !0, e.initialize = (t) => q(t), e.identify = (t) => {
    t && console.log("[Visual Designer] identify (snippet) called with:", t);
  }, e.enableEditor = () => (z ?? q()).enableEditor(), e.disableEditor = () => z?.disableEditor(), e.loadGuides = () => z?.loadGuides(), e.getGuides = () => z?.getGuides(), e.getInstance = Hi, e.init = q, zi(e._q));
  try {
    const t = new URL(window.location.href), i = t.searchParams.get("designer"), n = t.searchParams.get("mode"), r = t.searchParams.get("iud");
    i === "true" && (n && (window.__visualDesignerMode = n, localStorage.setItem("designerModeType", n)), localStorage.setItem("designerMode", "true"), r && localStorage.setItem(Ai, r), t.searchParams.delete("designer"), t.searchParams.delete("mode"), t.searchParams.delete("iud"), window.history.replaceState({}, "", t.toString()), window.__visualDesignerWasLaunched = !0);
  } catch {
  }
}
if (typeof window < "u" && !z && !Ui) {
  const e = () => {
    z || q();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e) : e();
}
typeof window < "u" && (window.VisualDesigner = {
  init: q,
  initialize: q,
  getInstance: Hi,
  DesignerSDK: Li,
  apiClient: oe,
  _processQueue: zi
});
export {
  Li as DesignerSDK,
  zi as _processQueue,
  oe as apiClient,
  Hi as getInstance,
  q as init
};
