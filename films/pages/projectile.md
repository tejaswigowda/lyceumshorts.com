---
slug: projectile
title: "Two motions at once: projectile motion | Lyceum Shorts"
status: published
description: "A thrown ball's path is two independent motions: constant horizontal speed, and vertical motion under constant gravity."
canonical: https://lyceumshorts.com/films/projectile/
---

<article class="entry">
<div class="entry-header">
<p class="crumb"><a href="/">Films</a> <span aria-hidden="true">/</span> Physics</p>
<h1>Two motions at once</h1>
<p class="meta"><span>Physics: projectile motion</span> <span aria-hidden="true">&middot;</span> <span>intro</span> <span aria-hidden="true">&middot;</span> <span class="duration">1:21</span> <span aria-hidden="true">&middot;</span> <span class="badge badge-demonstration" title="Shows the relationship in particular cases. It does not prove it in general.">Demonstration</span></p>
</div>
<p class="stale"><strong>This render is out of date.</strong> The scene has changed since the film was rendered, so the film and the scene no longer match. Open the scene for the current version.</p>
<div class="lyceum-player"></div>
<section class="open-the-scene">
<h2 id="open">Open the scene</h2>
<p>The film above was rendered from a scene file. Open it in Strata: <strong>live and editable</strong>. Change a number, move a camera, break it, and watch what follows.</p>
<p><a class="button" href="https://strataeditor.dev/#repo=tejaswigowda/test1&file=projectile.json&branch=main">Open the scene in Strata <span aria-hidden="true">&#8599;</span></a></p>
<p class="small">Or open <a href="https://strataeditor.dev/#repo=tejaswigowda/test1&file=projectile.json&branch=main&commit=f3a4a0e5874234ae4b3780626827b552038f928d">the exact version that was rendered</a> (commit <code>f3a4a0e</code>).</p>
</section>
<section>
<h2 id="claim">Claim</h2>
<p class="claim-text">A thrown ball's path is two independent motions: constant horizontal speed, and vertical motion under constant gravity.</p>
<p class="small"><strong>Demonstration.</strong> Shows the relationship in particular cases. It does not prove it in general.</p>
</section>
<section>
<h2 id="assumptions">Assumptions</h2>
<ul class="assumptions">
<li>no air resistance</li>
<li>constant gravity</li>
<li>flat ground, with launch and landing at one height</li>
<li>scene units, not SI: slow motion with g = 2.5 and a base speed of 6.32</li>
</ul>
</section>
<section>
<h2 id="checked">How it was checked</h2>
<ul>
<li>ball position against the closed form x = vx·t and y = 0.25 + vy·t − ½·g·t²: 35 samples, largest difference 0.002 scene units. Five flights: 30°, 45° and 60° at speed 1, and 45° at speeds 0.75 and 1.25</li>
</ul>
</section>
<section>
<h2 id="build">Build it yourself</h2>
<p>The tutorial builds this scene from an empty file, one pasted block at a time.</p>
<p><a class="button secondary" href="https://strataeditor.dev/about/tutorials/projectile.html">Read the tutorial</a></p>
</section>
<section>
<h2 id="transcript">Transcript</h2>
<p class="small">Captions are on by default in the player. Times link to that moment in the film.</p>
<ol class="transcript">
<li id="cue-1"><a class="ts" href="#player">0:01</a> Launch a ball at an angle, and it flies in a curve. <a class="cue-link" href="#cue-1" aria-label="Link to this passage">#</a></li>
<li id="cue-2"><a class="ts" href="#player">0:05</a> That one curve is really two simple motions, happening at once. <a class="cue-link" href="#cue-2" aria-label="Link to this passage">#</a></li>
<li id="cue-3"><a class="ts" href="#player">0:10</a> Across the ground, nothing pushes the ball sideways, so its horizontal speed never changes. Equal steps, in equal times. <a class="cue-link" href="#cue-3" aria-label="Link to this passage">#</a></li>
<li id="cue-4"><a class="ts" href="#player">0:21</a> Up and down, gravity pulls on the ball, so its vertical speed changes by the same amount every second. <a class="cue-link" href="#cue-4" aria-label="Link to this passage">#</a></li>
<li id="cue-5"><a class="ts" href="#player">0:28</a> It slows on the way up, stops for an instant at the top, then speeds up on the way down. <a class="cue-link" href="#cue-5" aria-label="Link to this passage">#</a></li>
<li id="cue-6"><a class="ts" href="#player">0:35</a> Now orbit the path. The ground sees only the sideways motion, and the pole sees only the up and down. <a class="cue-link" href="#cue-6" aria-label="Link to this passage">#</a></li>
<li id="cue-7"><a class="ts" href="#player">0:44</a> Put the two back together: at every moment, a sideways step plus an up and down step makes one step along the curve. <a class="cue-link" href="#cue-7" aria-label="Link to this passage">#</a></li>
<li id="cue-8"><a class="ts" href="#player">0:52</a> Change the angle, and the same two motions make a different curve. <a class="cue-link" href="#cue-8" aria-label="Link to this passage">#</a></li>
<li id="cue-9"><a class="ts" href="#player">0:57</a> Thirty and sixty degrees land in the same place. Forty-five degrees goes farthest. <a class="cue-link" href="#cue-9" aria-label="Link to this passage">#</a></li>
<li id="cue-10"><a class="ts" href="#player">1:04</a> Change the speed, and the whole curve scales: faster means higher and farther. <a class="cue-link" href="#cue-10" aria-label="Link to this passage">#</a></li>
<li id="cue-11"><a class="ts" href="#player">1:10</a> Independent components combine into one path. That is the whole idea. <a class="cue-link" href="#cue-11" aria-label="Link to this passage">#</a></li>
<li id="cue-12"><a class="ts" href="#player">1:17</a> Made with Strata. <a class="cue-link" href="#cue-12" aria-label="Link to this passage">#</a></li>
</ol>
<h3>What the colours mean</h3>
<p>The film uses colour to carry meaning. Here is what each one distinguishes.</p>
<dl class="colours">
<dt>aqua</dt><dd>the sideways motion: the ground line, the ball's shadow on the ground, and the sideways arrow, which never changes.</dd>
<dt>coral</dt><dd>the up-and-down motion: the pole, the bead on it, and the vertical arrow, which shrinks to nothing at the top.</dd>
<dt>purple</dt><dd>gravity, whose arrow never changes.</dd>
<dt>gold</dt><dd>the path: a dot every tenth of a second, a ring where the ball lands, and the arrow along the curve, which is the sum of the other two.</dd>
</dl>
</section>
<section>
<h2 id="source">Source, licence and credits</h2>
<ul>
<li>Scene: <a href="https://github.com/tejaswigowda/test1/blob/f3a4a0e5874234ae4b3780626827b552038f928d/projectile.json"><code>tejaswigowda/test1/projectile.json</code></a> at commit <code>f3a4a0e</code></li>
<li>Rendered from scene hash <code>sha256:59f138be4272&hellip;</code> by strata-export master, ffmpeg 8.1.1 + libx264 ladder</li>
<li>Licence: <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</a></li>
</ul>
<h3>Credits</h3>
<p>No third-party assets. Everything is built from primitives in the scene.</p>
<p class="small">Found a mistake? <a href="https://github.com/tejaswigowda/test1/issues">Open an issue</a> or send a pull request: that is what makes these films correctable. <a href="/about/">Why that matters</a>.</p>
</section>
</article>
