---
slug: contribute
title: Contribute | Lyceum Shorts
status: published
description: "How to add a short to Lyceum: a pull request adding an entry to lyceum.json plus the scene, tutorial and render."
canonical: https://lyceumshorts.com/contribute/
---

<div class="prose">
<h1>Contribute</h1>
<p class="lede">A submission is a pull request.</p>
<h2>What the pull request contains</h2>
<ol>
<li>An entry in <a href="https://github.com/tejaswigowda/lyceumshorts.com/blob/main/lyceum.json"><code>lyceum.json</code></a>. It is the only place a film is described; the pages are generated from it.</li>
<li>The <strong>scene</strong>, in a public repository, named in the entry's <code>scene</code> field.</li>
<li>The <strong>tutorial</strong> that builds the scene, linked from the entry.</li>
<li>The <strong>render</strong> under <code>renders/&lt;id&gt;/</code>, produced by <code>scripts/package-render.mjs</code> from a Strata offline master.</li>
</ol>
<h2>The bar</h2>
<ul>
<li>The tutorial meets the tutorial policy of the editor: it builds the film from an empty scene, and its contract states units, assumptions, whether the render was run, and that every object is named and classed.</li>
<li><strong>Claim stated</strong>: one sentence.</li>
<li><strong>Assumptions named</strong>: a visible list.</li>
<li><strong>Status honest</strong>: <code>demonstration</code> unless the film really derives the result for every case its assumptions cover.</li>
<li><strong>Checks reported</strong> where you ran them (samples and the largest residual). Leave <code>checks</code> empty if you ran none; the page will say so.</li>
<li><strong>Colour described</strong>: if colour carries meaning, say what each colour distinguishes in <code>colour_key</code>.</li>
<li><strong>Captions</strong> on every film.</li>
<li><strong>Original or openly licensed assets only</strong>, with credits listed.</li>
</ul>
<h2>Before you open it</h2>
<pre><code>node scripts/generate.mjs
node scripts/check.mjs</code></pre>
<p><code>generate.mjs</code> rebuilds the pages from <code>lyceum.json</code>; <code>check.mjs</code> runs the site's gates (every entry complete, no unearned "proof", every segment under 20 MB, captions present, no third-party requests, colour contrast) and <code>check.mjs --scenes</code> compares each render with its scene's current version.</p>
</div>
