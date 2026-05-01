// ===== Banker's Algorithm Suite =====
// Multi-page SPA with Simulator, Theory, and Quiz

(function () {
    'use strict';

    // ================================================================
    // ROUTER — Hash-based SPA navigation
    // ================================================================
    const pages = ['home', 'simulator', 'theory', 'quiz'];
    let currentPage = 'home';

    function initRouter() {
        // Navigation links
        document.querySelectorAll('.nav-link, .feature-link, .footer-links a, .inline-link, #hero-start-btn, #hero-learn-btn, #nav-logo-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const page = href.slice(1);
                    if (pages.includes(page)) {
                        navigateTo(page);
                    }
                }
            });
        });

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || 'home';
            if (pages.includes(hash) && hash !== currentPage) {
                navigateTo(hash, false);
            }
        });

        // Initial route
        const initialHash = window.location.hash.slice(1) || 'home';
        navigateTo(pages.includes(initialHash) ? initialHash : 'home', false);

        // Hamburger menu
        const hamburger = document.getElementById('nav-hamburger');
        const navLinks = document.getElementById('nav-links');
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('open');
                navLinks.classList.toggle('open');
            });
        }
    }

    function navigateTo(page, pushState = true) {
        currentPage = page;

        // Update hash
        if (pushState) {
            window.location.hash = page;
        }

        // Toggle pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) {
            target.classList.add('active');
            // Re-trigger animations
            target.querySelectorAll('.animate-in').forEach(el => {
                el.style.animation = 'none';
                el.offsetHeight;
                el.style.animation = '';
            });
        }

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        // Close mobile menu
        const hamburger = document.getElementById('nav-hamburger');
        const navLinks = document.getElementById('nav-links');
        if (hamburger) {
            hamburger.classList.remove('open');
            navLinks.classList.remove('open');
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Theory page section scrolling
    window.scrollToSection = function(sectionId) {
        const el = document.getElementById(sectionId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return false;
    };

    // ================================================================
    // SIMULATOR — Banker's Algorithm
    // ================================================================
    let numProcesses = 5;
    let numResources = 3;
    let available = [];
    let allocation = [];
    let maximum = [];
    let need = [];
    let lastResult = null;

    const $ = id => document.getElementById(id);

    function initSimulator() {
        const numProcInput = $('num-processes');
        const numResInput = $('num-resources');
        if (!numProcInput) return;

        $('btn-generate').addEventListener('click', generateMatrices);
        $('btn-example').addEventListener('click', loadExample);
        $('btn-reset').addEventListener('click', resetAll);
        $('btn-check-safety').addEventListener('click', checkSafety);
        $('btn-request').addEventListener('click', openRequestModal);
        $('btn-release').addEventListener('click', openReleaseModal);
        $('btn-submit-request').addEventListener('click', submitRequest);
        $('btn-submit-release').addEventListener('click', submitRelease);
        $('btn-play-trace').addEventListener('click', animateTrace);

        numProcInput.addEventListener('keyup', e => { if (e.key === 'Enter') generateMatrices(); });
        numResInput.addEventListener('keyup', e => { if (e.key === 'Enter') generateMatrices(); });
    }

    // --- Stepper ---
    window.adjustValue = function (id, delta) {
        const inp = $(id);
        let val = parseInt(inp.value) + delta;
        val = Math.max(parseInt(inp.min), Math.min(parseInt(inp.max), val));
        inp.value = val;
    };

    // --- Generate Matrices ---
    function generateMatrices() {
        const numProcInput = $('num-processes');
        const numResInput = $('num-resources');
        numProcesses = parseInt(numProcInput.value) || 5;
        numResources = parseInt(numResInput.value) || 3;
        numProcesses = Math.max(1, Math.min(10, numProcesses));
        numResources = Math.max(1, Math.min(10, numResources));

        available = Array(numResources).fill(0);
        allocation = Array.from({ length: numProcesses }, () => Array(numResources).fill(0));
        maximum = Array.from({ length: numProcesses }, () => Array(numResources).fill(0));
        need = Array.from({ length: numProcesses }, () => Array(numResources).fill(0));

        renderAvailable();
        renderMatrix('allocation-matrix', allocation, 'alloc');
        renderMatrix('maximum-matrix', maximum, 'max');
        renderNeed();

        $('matrices-section').classList.remove('hidden');
        $('results-section').classList.add('hidden');
        lastResult = null;

        document.querySelectorAll('#matrices-section .glass-card').forEach((card, i) => {
            card.style.animationDelay = `${i * 0.1}s`;
        });
    }

    // --- Render Available ---
    function renderAvailable() {
        const container = $('available-matrix');
        const resourceLabels = Array.from({ length: numResources }, (_, i) => `R${i}`);

        let html = '<table class="matrix-table"><thead><tr><th></th>';
        resourceLabels.forEach(r => { html += `<th>${r}</th>`; });
        html += '</tr></thead><tbody><tr><td class="row-label">Available</td>';
        for (let j = 0; j < numResources; j++) {
            html += `<td><input type="number" class="matrix-input" id="avail-${j}" value="${available[j]}" min="0" data-type="avail" data-j="${j}"></td>`;
        }
        html += '</tr></tbody></table>';
        container.innerHTML = html;

        container.querySelectorAll('.matrix-input').forEach(inp => {
            inp.addEventListener('change', () => {
                const j = parseInt(inp.dataset.j);
                available[j] = parseInt(inp.value) || 0;
                updateNeed();
            });
        });
    }

    // --- Render Allocation / Maximum Matrix ---
    function renderMatrix(containerId, data, prefix) {
        const container = $(containerId);
        const resourceLabels = Array.from({ length: numResources }, (_, i) => `R${i}`);

        let html = '<table class="matrix-table"><thead><tr><th></th>';
        resourceLabels.forEach(r => { html += `<th>${r}</th>`; });
        html += '</tr></thead><tbody>';

        for (let i = 0; i < numProcesses; i++) {
            html += `<tr><td class="row-label">P${i}</td>`;
            for (let j = 0; j < numResources; j++) {
                html += `<td><input type="number" class="matrix-input" id="${prefix}-${i}-${j}" value="${data[i][j]}" min="0" data-type="${prefix}" data-i="${i}" data-j="${j}"></td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;

        container.querySelectorAll('.matrix-input').forEach(inp => {
            inp.addEventListener('change', () => {
                const i = parseInt(inp.dataset.i);
                const j = parseInt(inp.dataset.j);
                data[i][j] = parseInt(inp.value) || 0;
                updateNeed();
            });
        });
    }

    // --- Render Need (read-only) ---
    function renderNeed() {
        const container = $('need-matrix');
        const resourceLabels = Array.from({ length: numResources }, (_, i) => `R${i}`);

        let html = '<table class="matrix-table"><thead><tr><th></th>';
        resourceLabels.forEach(r => { html += `<th>${r}</th>`; });
        html += '</tr></thead><tbody>';

        for (let i = 0; i < numProcesses; i++) {
            html += `<tr><td class="row-label">P${i}</td>`;
            for (let j = 0; j < numResources; j++) {
                const val = need[i][j];
                const negClass = val < 0 ? ' negative' : '';
                html += `<td><div class="matrix-cell-readonly${negClass}" id="need-${i}-${j}">${val}</div></td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // --- Update Need ---
    function updateNeed() {
        readMatrices();
        for (let i = 0; i < numProcesses; i++) {
            for (let j = 0; j < numResources; j++) {
                need[i][j] = maximum[i][j] - allocation[i][j];
            }
        }
        renderNeed();
    }

    // --- Read all matrices from DOM ---
    function readMatrices() {
        for (let j = 0; j < numResources; j++) {
            const inp = $(`avail-${j}`);
            if (inp) available[j] = parseInt(inp.value) || 0;
        }
        for (let i = 0; i < numProcesses; i++) {
            for (let j = 0; j < numResources; j++) {
                const allocInp = $(`alloc-${i}-${j}`);
                const maxInp = $(`max-${i}-${j}`);
                if (allocInp) allocation[i][j] = parseInt(allocInp.value) || 0;
                if (maxInp) maximum[i][j] = parseInt(maxInp.value) || 0;
            }
        }
        for (let i = 0; i < numProcesses; i++) {
            for (let j = 0; j < numResources; j++) {
                need[i][j] = maximum[i][j] - allocation[i][j];
            }
        }
    }

    // --- Banker's Safety Algorithm ---
    function runSafetyAlgorithm() {
        readMatrices();

        for (let i = 0; i < numProcesses; i++) {
            for (let j = 0; j < numResources; j++) {
                if (need[i][j] < 0) {
                    return {
                        safe: false,
                        sequence: [],
                        trace: [{
                            type: 'fail',
                            msg: `<strong>Error:</strong> Process P${i} has Allocation[${j}] > Maximum[${j}] — invalid configuration.`
                        }],
                        processStates: Array(numProcesses).fill('blocked')
                    };
                }
            }
        }

        const work = [...available];
        const finish = Array(numProcesses).fill(false);
        const sequence = [];
        const trace = [];
        let step = 0;

        trace.push({
            type: 'info',
            msg: `<strong>Initialize:</strong> Work = <code>[${work.join(', ')}]</code>, Finish = <code>[${finish.map(f => f ? 'T' : 'F').join(', ')}]</code>`
        });

        let found = true;
        while (found) {
            found = false;
            for (let i = 0; i < numProcesses; i++) {
                if (finish[i]) continue;

                let canFinish = true;
                for (let j = 0; j < numResources; j++) {
                    if (need[i][j] > work[j]) {
                        canFinish = false;
                        break;
                    }
                }

                if (canFinish) {
                    step++;
                    trace.push({
                        type: 'success',
                        msg: `<strong>Step ${step}:</strong> P${i} can be satisfied. Need <code>[${need[i].join(', ')}]</code> ≤ Work <code>[${work.join(', ')}]</code>`
                    });

                    for (let j = 0; j < numResources; j++) {
                        work[j] += allocation[i][j];
                    }
                    finish[i] = true;
                    sequence.push(i);

                    trace.push({
                        type: 'info',
                        msg: `P${i} finishes → releases resources. Work = <code>[${work.join(', ')}]</code>`
                    });

                    found = true;
                } else {
                    trace.push({
                        type: 'fail',
                        msg: `P${i} cannot be satisfied. Need <code>[${need[i].join(', ')}]</code> > Work <code>[${work.join(', ')}]</code>`
                    });
                }
            }
        }

        const isSafe = finish.every(f => f);
        const processStates = finish.map((f, i) => {
            if (f) return sequence.indexOf(i) < sequence.length ? 'completed' : 'waiting';
            return 'blocked';
        });

        if (isSafe) {
            trace.push({
                type: 'success',
                msg: `<strong>Result:</strong> System is in a <strong>SAFE</strong> state! Safe sequence: <code>< ${sequence.map(i => 'P' + i).join(', ')} ></code>`
            });
        } else {
            const blockedProcesses = finish.map((f, i) => f ? null : 'P' + i).filter(Boolean);
            trace.push({
                type: 'fail',
                msg: `<strong>Result:</strong> System is in an <strong>UNSAFE</strong> state! Processes <code>${blockedProcesses.join(', ')}</code> cannot complete — potential deadlock.`
            });
        }

        return { safe: isSafe, sequence, trace, processStates };
    }

    function checkSafety() {
        readMatrices();
        renderNeed();
        const result = runSafetyAlgorithm();
        lastResult = result;
        displayResults(result);
    }

    function displayResults(result) {
        const section = $('results-section');
        section.classList.remove('hidden');

        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        const banner = $('state-banner');
        const icon = $('state-icon');
        const title = $('state-title');
        const desc = $('state-description');

        banner.classList.remove('safe', 'unsafe');

        if (result.safe) {
            banner.classList.add('safe');
            icon.innerHTML = '🛡️';
            title.textContent = 'System is in a SAFE State';
            desc.textContent = `A safe sequence exists. All ${numProcesses} processes can complete without deadlock.`;
        } else {
            banner.classList.add('unsafe');
            icon.innerHTML = '⚠️';
            const blockedCount = result.processStates.filter(s => s === 'blocked').length;
            title.textContent = 'System is in an UNSAFE State';
            desc.textContent = `No safe sequence exists. ${blockedCount} process${blockedCount > 1 ? 'es' : ''} may deadlock.`;
        }

        renderSequence(result);
        renderResourceBars();
        renderTrace(result.trace);
        renderProcessDiagrams(result);
        highlightMatrixCells(result);
    }

    function renderSequence(result) {
        const container = $('safe-sequence');
        container.innerHTML = '';

        if (result.safe) {
            result.sequence.forEach((proc, idx) => {
                const node = document.createElement('div');
                node.className = 'sequence-node safe-node';
                node.textContent = `P${proc}`;
                node.style.animationDelay = `${idx * 0.12}s`;
                container.appendChild(node);

                if (idx < result.sequence.length - 1) {
                    const arrow = document.createElement('span');
                    arrow.className = 'sequence-arrow';
                    arrow.textContent = '→';
                    arrow.style.animationDelay = `${idx * 0.12 + 0.06}s`;
                    container.appendChild(arrow);
                }
            });
        } else {
            const completed = result.sequence;
            const blocked = result.processStates
                .map((s, i) => s === 'blocked' ? i : null)
                .filter(x => x !== null);

            if (completed.length > 0) {
                completed.forEach((proc, idx) => {
                    const node = document.createElement('div');
                    node.className = 'sequence-node safe-node';
                    node.textContent = `P${proc}`;
                    node.style.animationDelay = `${idx * 0.12}s`;
                    container.appendChild(node);

                    const arrow = document.createElement('span');
                    arrow.className = 'sequence-arrow';
                    arrow.textContent = '→';
                    arrow.style.animationDelay = `${idx * 0.12 + 0.06}s`;
                    container.appendChild(arrow);
                });
            }

            blocked.forEach((proc, idx) => {
                const node = document.createElement('div');
                node.className = 'sequence-node unsafe-node';
                node.textContent = `P${proc}`;
                node.style.animationDelay = `${(completed.length + idx) * 0.12}s`;
                container.appendChild(node);

                if (idx < blocked.length - 1) {
                    const arrow = document.createElement('span');
                    arrow.className = 'sequence-arrow';
                    arrow.textContent = '✕';
                    arrow.style.animationDelay = `${(completed.length + idx) * 0.12 + 0.06}s`;
                    arrow.style.color = '#f43f5e';
                    container.appendChild(arrow);
                }
            });
        }
    }

    function renderResourceBars() {
        readMatrices();
        const container = $('resource-bars');
        container.innerHTML = '';

        const colorPairs = [
            ['#6366f1', '#a855f7'],
            ['#3b82f6', '#22d3ee'],
            ['#34d399', '#10b981'],
            ['#f59e0b', '#f97316'],
            ['#f43f5e', '#ec4899'],
            ['#8b5cf6', '#6366f1'],
            ['#14b8a6', '#22d3ee'],
            ['#ef4444', '#f43f5e'],
            ['#84cc16', '#34d399'],
            ['#e879f9', '#a855f7']
        ];

        for (let j = 0; j < numResources; j++) {
            let totalAllocated = 0;
            for (let i = 0; i < numProcesses; i++) {
                totalAllocated += allocation[i][j];
            }
            const total = totalAllocated + available[j];
            const pct = total > 0 ? (totalAllocated / total * 100) : 0;
            const colors = colorPairs[j % colorPairs.length];

            const item = document.createElement('div');
            item.className = 'resource-bar-item';
            item.innerHTML = `
                <div class="resource-bar-label">
                    <span>R${j}</span>
                    <span>${totalAllocated} / ${total} allocated (${Math.round(pct)}%)</span>
                </div>
                <div class="resource-bar-track">
                    <div class="resource-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, ${colors[0]}, ${colors[1]})"></div>
                </div>
            `;
            container.appendChild(item);
        }
    }

    function renderTrace(trace, animate = false) {
        const container = $('trace-steps');
        container.innerHTML = '';

        trace.forEach((step, idx) => {
            const div = document.createElement('div');
            div.className = `trace-step ${step.type}`;
            if (!animate) div.classList.add('visible');
            div.innerHTML = `
                <div class="trace-step-num">${idx + 1}</div>
                <div class="trace-step-content">${step.msg}</div>
            `;
            if (animate) {
                div.style.transitionDelay = `${idx * 0.1}s`;
            }
            container.appendChild(div);
        });
    }

    function animateTrace() {
        if (!lastResult) return;
        renderTrace(lastResult.trace, true);
        const steps = document.querySelectorAll('.trace-step');
        steps.forEach((step, idx) => {
            setTimeout(() => {
                step.classList.add('visible');
                step.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, idx * 300);
        });
    }

    function renderProcessDiagrams(result) {
        readMatrices();
        const container = $('process-diagrams');
        container.innerHTML = '';

        for (let i = 0; i < numProcesses; i++) {
            const state = result.processStates[i];
            const statusLabel = state === 'completed' ? 'Completed' : state === 'waiting' ? 'Waiting' : 'Blocked';
            const card = document.createElement('div');
            card.className = `process-card ${state}`;

            let maxTotal = 0;
            for (let j = 0; j < numResources; j++) {
                maxTotal = Math.max(maxTotal, maximum[i][j]);
            }
            if (maxTotal === 0) maxTotal = 1;

            let barsHtml = '';
            for (let j = 0; j < numResources; j++) {
                const allocPct = maxTotal > 0 ? (allocation[i][j] / maxTotal * 100) : 0;
                barsHtml += `
                    <div class="process-bar-row">
                        <div class="process-bar-label">R${j}: alloc ${allocation[i][j]} / need ${need[i][j]}</div>
                        <div class="process-bar-track">
                            <div class="process-bar-fill alloc-fill" style="width: ${allocPct}%"></div>
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="process-card-header">
                    <div class="process-card-name">P${i}</div>
                    <div class="process-card-status">${statusLabel}</div>
                </div>
                <div class="process-card-bars">${barsHtml}</div>
            `;
            container.appendChild(card);
        }
    }

    function highlightMatrixCells(result) {
        document.querySelectorAll('.matrix-input').forEach(inp => {
            inp.classList.remove('highlight-safe', 'highlight-unsafe');
        });

        for (let i = 0; i < numProcesses; i++) {
            const cls = result.processStates[i] === 'blocked' ? 'highlight-unsafe' : 'highlight-safe';
            for (let j = 0; j < numResources; j++) {
                const allocInp = $(`alloc-${i}-${j}`);
                const maxInp = $(`max-${i}-${j}`);
                if (allocInp) allocInp.classList.add(cls);
                if (maxInp) maxInp.classList.add(cls);
            }
        }
    }

    // --- Resource Request ---
    function openRequestModal() {
        readMatrices();
        const modal = $('request-modal');
        modal.classList.remove('hidden');

        const select = $('request-process');
        select.innerHTML = '';
        for (let i = 0; i < numProcesses; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Process P${i}`;
            select.appendChild(opt);
        }

        renderRequestInputs();
        $('request-validation').classList.add('hidden');
        $('modal-title').textContent = 'Resource Request';
    }

    function renderRequestInputs() {
        const container = $('request-resources-inputs');
        container.innerHTML = '<label>Resources to Request</label>';
        for (let j = 0; j < numResources; j++) {
            container.innerHTML += `
                <div class="resource-request-row">
                    <label>R${j}</label>
                    <input type="number" class="matrix-input" id="req-r-${j}" value="0" min="0">
                </div>
            `;
        }
    }

    window.closeModal = function () {
        $('request-modal').classList.add('hidden');
    };

    function submitRequest() {
        readMatrices();
        const pid = parseInt($('request-process').value);
        const request = [];
        for (let j = 0; j < numResources; j++) {
            request.push(parseInt($(`req-r-${j}`).value) || 0);
        }

        const validationEl = $('request-validation');
        validationEl.classList.remove('hidden', 'error', 'success', 'warning');

        for (let j = 0; j < numResources; j++) {
            if (request[j] > need[pid][j]) {
                validationEl.classList.add('error');
                validationEl.textContent = `Error: Request for R${j} (${request[j]}) exceeds need (${need[pid][j]}) for P${pid}. Process has exceeded its maximum claim.`;
                return;
            }
        }

        for (let j = 0; j < numResources; j++) {
            if (request[j] > available[j]) {
                validationEl.classList.add('warning');
                validationEl.textContent = `P${pid} must wait — Request for R${j} (${request[j]}) exceeds available (${available[j]}). Resources not currently available.`;
                return;
            }
        }

        const tempAvail = [...available];
        const tempAlloc = allocation.map(r => [...r]);

        for (let j = 0; j < numResources; j++) {
            tempAvail[j] -= request[j];
            tempAlloc[pid][j] += request[j];
        }

        const origAvail = [...available];
        const origAlloc = allocation.map(r => [...r]);

        available = tempAvail;
        allocation = tempAlloc;
        for (let i = 0; i < numProcesses; i++) {
            for (let j = 0; j < numResources; j++) {
                need[i][j] = maximum[i][j] - allocation[i][j];
            }
        }

        const result = runSafetyAlgorithm();

        if (result.safe) {
            validationEl.classList.add('success');
            validationEl.textContent = `✓ Request granted! System remains in a safe state. Resources allocated to P${pid}.`;

            for (let j = 0; j < numResources; j++) {
                $(`avail-${j}`).value = available[j];
                $(`alloc-${pid}-${j}`).value = allocation[pid][j];
            }
            renderNeed();

            setTimeout(() => {
                closeModal();
                checkSafety();
            }, 1500);
        } else {
            available = origAvail;
            allocation = origAlloc;
            for (let i = 0; i < numProcesses; i++) {
                for (let j = 0; j < numResources; j++) {
                    need[i][j] = maximum[i][j] - allocation[i][j];
                }
            }

            validationEl.classList.add('error');
            validationEl.textContent = `✕ Request denied! Granting this request would leave the system in an UNSAFE state. P${pid} must wait.`;
        }
    }

    // --- Release Resources ---
    function openReleaseModal() {
        readMatrices();
        const modal = $('release-modal');
        modal.classList.remove('hidden');

        const select = $('release-process');
        select.innerHTML = '';
        for (let i = 0; i < numProcesses; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Process P${i}`;
            select.appendChild(opt);
        }

        renderReleaseInputs();
        $('release-validation').classList.add('hidden');

        select.addEventListener('change', renderReleaseInputs);
    }

    function renderReleaseInputs() {
        readMatrices();
        const pid = parseInt($('release-process').value);
        const container = $('release-resources-inputs');
        container.innerHTML = '<label>Resources to Release</label>';
        for (let j = 0; j < numResources; j++) {
            container.innerHTML += `
                <div class="resource-request-row">
                    <label>R${j}</label>
                    <input type="number" class="matrix-input" id="rel-r-${j}" value="0" min="0" max="${allocation[pid][j]}">
                    <span style="font-size:0.75rem;color:var(--text-muted)">max: ${allocation[pid][j]}</span>
                </div>
            `;
        }
    }

    window.closeReleaseModal = function () {
        $('release-modal').classList.add('hidden');
    };

    function submitRelease() {
        readMatrices();
        const pid = parseInt($('release-process').value);
        const release = [];
        for (let j = 0; j < numResources; j++) {
            release.push(parseInt($(`rel-r-${j}`).value) || 0);
        }

        const validationEl = $('release-validation');
        validationEl.classList.remove('hidden', 'error', 'success', 'warning');

        for (let j = 0; j < numResources; j++) {
            if (release[j] > allocation[pid][j]) {
                validationEl.classList.add('error');
                validationEl.textContent = `Error: Cannot release more R${j} (${release[j]}) than currently allocated (${allocation[pid][j]}).`;
                return;
            }
        }

        if (release.every(r => r === 0)) {
            validationEl.classList.add('warning');
            validationEl.textContent = 'Please specify at least one resource to release.';
            return;
        }

        for (let j = 0; j < numResources; j++) {
            available[j] += release[j];
            allocation[pid][j] -= release[j];
            need[pid][j] = maximum[pid][j] - allocation[pid][j];
        }

        for (let j = 0; j < numResources; j++) {
            $(`avail-${j}`).value = available[j];
            $(`alloc-${pid}-${j}`).value = allocation[pid][j];
        }
        renderNeed();

        validationEl.classList.add('success');
        validationEl.textContent = `✓ P${pid} released resources [${release.join(', ')}]. Available resources updated.`;

        setTimeout(() => {
            closeReleaseModal();
            checkSafety();
        }, 1200);
    }

    // --- Load Example ---
    function loadExample() {
        const numProcInput = $('num-processes');
        const numResInput = $('num-resources');
        numProcInput.value = 5;
        numResInput.value = 3;
        numProcesses = 5;
        numResources = 3;

        available = [3, 3, 2];
        allocation = [
            [0, 1, 0],
            [2, 0, 0],
            [3, 0, 2],
            [2, 1, 1],
            [0, 0, 2]
        ];
        maximum = [
            [7, 5, 3],
            [3, 2, 2],
            [9, 0, 2],
            [2, 2, 2],
            [4, 3, 3]
        ];
        need = Array.from({ length: 5 }, (_, i) =>
            Array.from({ length: 3 }, (_, j) => maximum[i][j] - allocation[i][j])
        );

        renderAvailable();
        renderMatrix('allocation-matrix', allocation, 'alloc');
        renderMatrix('maximum-matrix', maximum, 'max');
        renderNeed();

        $('matrices-section').classList.remove('hidden');
        $('results-section').classList.add('hidden');
        lastResult = null;

        for (let j = 0; j < numResources; j++) {
            $(`avail-${j}`).value = available[j];
        }
        for (let i = 0; i < numProcesses; i++) {
            for (let j = 0; j < numResources; j++) {
                $(`alloc-${i}-${j}`).value = allocation[i][j];
                $(`max-${i}-${j}`).value = maximum[i][j];
            }
        }

        document.querySelectorAll('#matrices-section .glass-card').forEach((card, i) => {
            card.style.animation = 'none';
            card.offsetHeight;
            card.style.animation = '';
            card.style.animationDelay = `${i * 0.1}s`;
        });
    }

    // --- Reset All ---
    function resetAll() {
        const numProcInput = $('num-processes');
        const numResInput = $('num-resources');
        numProcInput.value = 5;
        numResInput.value = 3;
        $('matrices-section').classList.add('hidden');
        $('results-section').classList.add('hidden');
        lastResult = null;

        available = [];
        allocation = [];
        maximum = [];
        need = [];

        document.querySelectorAll('.matrix-input').forEach(inp => {
            inp.classList.remove('highlight-safe', 'highlight-unsafe');
        });
    }

    // ================================================================
    // QUIZ — Interactive Quiz System
    // ================================================================
    const quizQuestions = [
        {
            question: "Which of the following is NOT one of the four necessary conditions for deadlock?",
            options: ["Mutual Exclusion", "Hold and Wait", "Starvation", "Circular Wait"],
            correct: 2,
            explanation: "The four necessary conditions for deadlock are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Starvation is a different concept where a process waits indefinitely because other processes keep getting the resources."
        },
        {
            question: "The Banker's Algorithm is an example of which deadlock handling strategy?",
            options: ["Deadlock Prevention", "Deadlock Avoidance", "Deadlock Detection", "Deadlock Recovery"],
            correct: 1,
            explanation: "The Banker's Algorithm is a deadlock avoidance strategy. It examines the resource-allocation state before granting any request to ensure the system stays in a safe state."
        },
        {
            question: "In the Banker's Algorithm, what does the Need matrix represent?",
            options: ["Total resources in the system", "Maximum − Allocation", "Available + Allocation", "Maximum + Available"],
            correct: 1,
            explanation: "Need[i][j] = Maximum[i][j] − Allocation[i][j]. It represents the remaining resources that process Pi may still request to complete its task."
        },
        {
            question: "A system is in a safe state if:",
            options: ["No process is currently blocked", "There exists at least one safe sequence", "All resources are currently available", "No process has made any request"],
            correct: 1,
            explanation: "A system is in a safe state if there exists at least one sequence of processes (safe sequence) in which all processes can complete execution without deadlock."
        },
        {
            question: "Who developed the Banker's Algorithm?",
            options: ["Alan Turing", "Edsger Dijkstra", "Donald Knuth", "Leslie Lamport"],
            correct: 1,
            explanation: "The Banker's Algorithm was developed by Edsger W. Dijkstra in 1965 as part of his work on the THE operating system."
        },
        {
            question: "In the safety algorithm, what is initialized as a copy of the Available vector?",
            options: ["Need", "Finish", "Work", "Allocation"],
            correct: 2,
            explanation: "In the safety algorithm, the Work vector is initialized as a copy of Available. It tracks the cumulative resources available as processes complete."
        },
        {
            question: "If the system is in an unsafe state, it necessarily means:",
            options: ["A deadlock has occurred", "A deadlock might occur", "All processes are blocked", "No process can complete"],
            correct: 1,
            explanation: "An unsafe state means deadlock is possible but not certain. There is no guarantee that a deadlock will occur, but the system cannot guarantee that it won't."
        },
        {
            question: "When a process completes in the safety algorithm, what happens to its allocated resources?",
            options: ["They are destroyed", "They are added to the Work vector", "They are given to the next process only", "They remain allocated"],
            correct: 1,
            explanation: "When a process completes (Finish[i] = true), its allocated resources are released and added back to the Work vector: Work = Work + Allocation[i]."
        },
        {
            question: "The Banker's Algorithm requires advance knowledge of:",
            options: ["Process execution time", "Maximum resource needs of each process", "CPU scheduling algorithm", "Memory size"],
            correct: 1,
            explanation: "The Banker's Algorithm requires each process to declare its maximum resource needs in advance. This information is stored in the Maximum matrix."
        },
        {
            question: "What happens when a resource request would leave the system in an unsafe state?",
            options: ["The request is granted anyway", "The system terminates the process", "The requesting process must wait", "All resources are reclaimed"],
            correct: 2,
            explanation: "If granting a request would lead to an unsafe state, the request is denied and the process must wait until resources can be safely allocated."
        },
        {
            question: "In the Banker's Algorithm, how many resource types can be managed?",
            options: ["Only 1", "Only 2", "Any number", "Maximum 4"],
            correct: 2,
            explanation: "The Banker's Algorithm can manage any number of resource types (m types). The matrices are simply sized accordingly (n×m for process-resource matrices)."
        },
        {
            question: "The 'No Preemption' condition for deadlock means:",
            options: ["Processes cannot be interrupted", "Resources cannot be forcibly taken away", "Only one process can run at a time", "Context switching is disabled"],
            correct: 1,
            explanation: "No Preemption means resources cannot be forcibly taken from a process. A resource can only be released voluntarily by the process holding it."
        },
        {
            question: "Which condition for deadlock involves a chain of processes waiting for each other?",
            options: ["Mutual Exclusion", "Hold and Wait", "No Preemption", "Circular Wait"],
            correct: 3,
            explanation: "Circular Wait means there exists a set of waiting processes {P0, P1, ..., Pn} where P0 waits for a resource held by P1, P1 waits for P2, ..., and Pn waits for P0."
        },
        {
            question: "What is the time complexity of the Banker's Safety Algorithm?",
            options: ["O(n)", "O(n × m)", "O(n² × m)", "O(n!)"],
            correct: 2,
            explanation: "The safety algorithm has O(n² × m) time complexity, where n is the number of processes and m is the number of resource types. In the worst case, it iterates through all n processes in each of n passes."
        },
        {
            question: "The Ostrich Algorithm refers to:",
            options: ["A faster version of Banker's Algorithm", "Pretending deadlocks never happen", "Detecting deadlocks using graphs", "Preventing deadlocks by ordering resources"],
            correct: 1,
            explanation: "The Ostrich Algorithm is the approach of simply ignoring deadlocks, pretending they never happen. It's used in many real operating systems (like Linux and Windows) because deadlocks are rare in practice."
        }
    ];

    let quizState = {
        currentQuestion: 0,
        score: 0,
        answered: new Array(quizQuestions.length).fill(null),
        completed: false
    };

    function initQuiz() {
        const restartBtn = $('btn-restart-quiz');
        const retryBtn = $('btn-retry-quiz');
        if (restartBtn) restartBtn.addEventListener('click', resetQuiz);
        if (retryBtn) retryBtn.addEventListener('click', resetQuiz);

        renderQuiz();
    }

    function renderQuiz() {
        const container = $('quiz-container');
        if (!container) return;
        container.innerHTML = '';

        quizQuestions.forEach((q, qIdx) => {
            const card = document.createElement('div');
            card.className = 'quiz-question-card';
            card.id = `quiz-q-${qIdx}`;
            card.style.animationDelay = `${qIdx * 0.05}s`;

            const optionsHtml = q.options.map((opt, oIdx) => {
                const markers = ['A', 'B', 'C', 'D'];
                return `
                    <div class="question-option" data-question="${qIdx}" data-option="${oIdx}" id="q${qIdx}-opt${oIdx}">
                        <div class="option-marker">${markers[oIdx]}</div>
                        <span>${opt}</span>
                    </div>
                `;
            }).join('');

            card.innerHTML = `
                <div class="question-header">
                    <div class="question-num">${qIdx + 1}</div>
                    <div class="question-text">${q.question}</div>
                </div>
                <div class="question-options" id="q${qIdx}-options">
                    ${optionsHtml}
                </div>
            `;
            container.appendChild(card);
        });

        // Bind option clicks
        container.querySelectorAll('.question-option').forEach(opt => {
            opt.addEventListener('click', handleOptionClick);
        });

        updateQuizProgress();
    }

    function handleOptionClick(e) {
        const option = e.currentTarget;
        const qIdx = parseInt(option.dataset.question);
        const oIdx = parseInt(option.dataset.option);

        // Skip if already answered
        if (quizState.answered[qIdx] !== null) return;

        const q = quizQuestions[qIdx];
        const isCorrect = oIdx === q.correct;

        quizState.answered[qIdx] = oIdx;
        if (isCorrect) quizState.score++;

        // Mark all options
        const optionsContainer = $(`q${qIdx}-options`);
        optionsContainer.querySelectorAll('.question-option').forEach((opt, idx) => {
            opt.classList.add('disabled');
            if (idx === q.correct) {
                opt.classList.add('correct');
            } else if (idx === oIdx && !isCorrect) {
                opt.classList.add('wrong');
            }
        });

        // Update card state
        const card = $(`quiz-q-${qIdx}`);
        card.classList.add(isCorrect ? 'answered-correct' : 'answered-wrong');

        // Show explanation
        const explDiv = document.createElement('div');
        explDiv.className = `question-explanation ${isCorrect ? 'correct-expl' : 'wrong-expl'}`;
        explDiv.innerHTML = `<strong>${isCorrect ? '✓ Correct!' : '✕ Incorrect.'}</strong> ${q.explanation}`;
        card.appendChild(explDiv);

        updateQuizProgress();

        // Check if quiz is complete
        const answeredCount = quizState.answered.filter(a => a !== null).length;
        if (answeredCount === quizQuestions.length) {
            setTimeout(showQuizResults, 800);
        }
    }

    function updateQuizProgress() {
        const answeredCount = quizState.answered.filter(a => a !== null).length;
        const total = quizQuestions.length;
        const pct = (answeredCount / total) * 100;

        const progressFill = $('quiz-progress-fill');
        const progressText = $('quiz-progress-text');
        const scoreEl = $('quiz-score');

        if (progressFill) progressFill.style.width = `${pct}%`;
        if (progressText) progressText.textContent = `Question ${answeredCount} / ${total}`;
        if (scoreEl) scoreEl.textContent = quizState.score;
    }

    function showQuizResults() {
        const resultsSection = $('quiz-results');
        if (!resultsSection) return;
        resultsSection.classList.remove('hidden');

        const total = quizQuestions.length;
        const correct = quizState.score;
        const wrong = total - correct;
        const pct = Math.round((correct / total) * 100);

        $('qr-correct').textContent = correct;
        $('qr-wrong').textContent = wrong;
        $('qr-percentage').textContent = `${pct}%`;

        const icon = $('quiz-results-icon');
        const title = $('quiz-results-title');
        const desc = $('quiz-results-desc');

        if (pct >= 80) {
            icon.textContent = '🏆';
            title.textContent = 'Excellent Work!';
            desc.textContent = `You scored ${correct}/${total}. You have a strong understanding of deadlock avoidance concepts!`;
        } else if (pct >= 60) {
            icon.textContent = '🌟';
            title.textContent = 'Good Job!';
            desc.textContent = `You scored ${correct}/${total}. Review the theory section to strengthen your understanding.`;
        } else if (pct >= 40) {
            icon.textContent = '📚';
            title.textContent = 'Keep Learning!';
            desc.textContent = `You scored ${correct}/${total}. Check out the theory page and try the simulator for hands-on practice.`;
        } else {
            icon.textContent = '💪';
            title.textContent = 'Don\'t Give Up!';
            desc.textContent = `You scored ${correct}/${total}. Start with the theory page to build your foundation, then come back!`;
        }

        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function resetQuiz() {
        quizState = {
            currentQuestion: 0,
            score: 0,
            answered: new Array(quizQuestions.length).fill(null),
            completed: false
        };

        const resultsSection = $('quiz-results');
        if (resultsSection) resultsSection.classList.add('hidden');

        renderQuiz();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ================================================================
    // INIT
    // ================================================================
    document.addEventListener('DOMContentLoaded', () => {
        initRouter();
        initSimulator();
        initQuiz();
    });

})();
