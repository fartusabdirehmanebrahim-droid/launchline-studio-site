/* Small LBP-cascade face detector (OpenCV lbpcascade_frontalface model), runs fully in the browser.
   detectFaces(gray, W, H, model, opts) -> [{x,y,w,h,n}] in the coordinates of the gray image. */
(function (root) {
  function integral(gray, W, H) {
    var W1 = W + 1, ii = new Float64Array(W1 * (H + 1));
    for (var y = 0; y < H; y++) {
      var row = 0;
      for (var x = 0; x < W; x++) {
        row += gray[y * W + x];
        ii[(y + 1) * W1 + x + 1] = ii[y * W1 + x + 1] + row;
      }
    }
    return ii;
  }
  function boxSum(ii, W1, x, y, w, h) {
    return ii[(y + h) * W1 + x + w] - ii[y * W1 + x + w] - ii[(y + h) * W1 + x] + ii[y * W1 + x];
  }
  function lbp(ii, W1, x, y, w, h) {
    var c = boxSum(ii, W1, x + w, y + h, w, h);
    return (boxSum(ii, W1, x, y, w, h) >= c ? 128 : 0) |
      (boxSum(ii, W1, x + w, y, w, h) >= c ? 64 : 0) |
      (boxSum(ii, W1, x + 2 * w, y, w, h) >= c ? 32 : 0) |
      (boxSum(ii, W1, x + 2 * w, y + h, w, h) >= c ? 16 : 0) |
      (boxSum(ii, W1, x + 2 * w, y + 2 * h, w, h) >= c ? 8 : 0) |
      (boxSum(ii, W1, x + w, y + 2 * h, w, h) >= c ? 4 : 0) |
      (boxSum(ii, W1, x, y + 2 * h, w, h) >= c ? 2 : 0) |
      (boxSum(ii, W1, x, y + h, w, h) >= c ? 1 : 0);
  }
  function evalWindow(ii, W1, wx, wy, s, m) {
    var F = m.features;
    for (var si = 0; si < m.stages.length; si++) {
      var st = m.stages[si], sum = 0, weak = st[1];
      for (var k = 0; k < weak.length; k++) {
        var wk = weak[k], f = F[wk[0]];
        var fw = Math.round(f[2] * s), fh = Math.round(f[3] * s);
        if (fw < 1) fw = 1; if (fh < 1) fh = 1;
        var code = lbp(ii, W1, wx + Math.round(f[0] * s), wy + Math.round(f[1] * s), fw, fh);
        sum += (wk[1][code >> 5] & (1 << (code & 31))) ? wk[2] : wk[3];
      }
      if (sum < st[0]) return false;
    }
    return true;
  }
  function group(rects, minNeighbors) {
    // union rectangles that overlap strongly (like OpenCV groupRectangles, eps 0.2)
    var labels = rects.map(function (_, i) { return i; });
    function find(i) { while (labels[i] !== i) i = labels[i] = labels[labels[i]]; return i; }
    function similar(a, b) {
      var d = 0.2 * 0.5 * (Math.min(a.w, b.w) + Math.min(a.h, b.h));
      return Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d &&
        Math.abs(a.x + a.w - b.x - b.w) <= d && Math.abs(a.y + a.h - b.y - b.h) <= d;
    }
    for (var i = 0; i < rects.length; i++) for (var j = i + 1; j < rects.length; j++)
      if (similar(rects[i], rects[j])) labels[find(i)] = find(j);
    var groups = {};
    rects.forEach(function (r, i) { var l = find(i); (groups[l] = groups[l] || []).push(r); });
    var out = [];
    Object.keys(groups).forEach(function (k) {
      var g = groups[k]; if (g.length < minNeighbors) return;
      var n = g.length, s = g.reduce(function (a, r) { return { x: a.x + r.x, y: a.y + r.y, w: a.w + r.w, h: a.h + r.h }; }, { x: 0, y: 0, w: 0, h: 0 });
      out.push({ x: s.x / n, y: s.y / n, w: s.w / n, h: s.h / n, n: n });
    });
    // drop boxes mostly inside a stronger one
    out.sort(function (a, b) { return b.n - a.n; });
    return out.filter(function (r, i) {
      return !out.some(function (o, j) {
        return j < i && r.x >= o.x - 0.2 * o.w && r.y >= o.y - 0.2 * o.h && r.x + r.w <= o.x + 1.2 * o.w && r.y + r.h <= o.y + 1.2 * o.h;
      });
    });
  }
  function detectFaces(gray, W, H, m, opts) {
    opts = opts || {};
    var ii = integral(gray, W, H), W1 = W + 1, rects = [];
    var minSize = opts.minSize || Math.max(m.w, Math.round(Math.min(W, H) * 0.12));
    var factor = opts.scaleFactor || 1.1;
    for (var s = minSize / m.w; m.w * s <= Math.min(W, H); s *= factor) {
      var win = Math.round(m.w * s), step = Math.max(1, Math.round(s * 1.5));
      for (var y = 0; y + win < H; y += step)
        for (var x = 0; x + win < W; x += step)
          if (evalWindow(ii, W1, x, y, s, m)) rects.push({ x: x, y: y, w: win, h: win });
    }
    return group(rects, opts.minNeighbors || 3);
  }
  root.detectFaces = detectFaces;
  if (typeof module !== 'undefined') module.exports = { detectFaces: detectFaces };
})(typeof window !== 'undefined' ? window : globalThis);
