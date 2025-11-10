document.addEventListener('DOMContentLoaded', function () {
    // ============================================================================
    // DOM ELEMENTS
    // ============================================================================
    const elements = {
        marksBody: document.getElementById('marksBody'),
        addRowBtn: document.getElementById('addRowBtn'),
        addRowError: document.getElementById('addRowError'),
        targetInput: document.getElementById('target'),
        targetOutput: document.getElementById('targetOutput'),
        totalWeightCell: document.getElementById('totalWeight'),
        totalWeightedScoreCell: document.getElementById('totalWeightedScore'),
        predictedGradeCell: document.getElementById('predictedGrade'),
        clearBtn: document.getElementById('clearBtn'),
        calculateTargetBtn: document.getElementById('calculateTargetBtn'),
        boundaries: {
            first: document.getElementById('boundary1st'),
            upperSecond: document.getElementById('boundary21'),
            lowerSecond: document.getElementById('boundary22'),
            third: document.getElementById('boundary3rd'),
            fail: document.getElementById('boundaryFail')
        },
        resetBoundariesBtn: document.getElementById('resetBoundariesBtn'),
        celebration: document.getElementById('celebration')
    };

    // ============================================================================
    // CONSTANTS
    // ============================================================================
    const MAX_ASSESSMENTS = 6;

    const DEFAULT_BOUNDARIES = {
        '1st': 70,
        '2.1': 60,
        '2.2': 50,
        '3rd': 40,
        'fail': 30
    };

    const CONFETTI_CONFIG = {
        count: 300,
        minSize: 4,
        maxSize: 12,
        minDistance: 100,
        maxDistance: 1100,
        minDuration: 1.5,
        maxDuration: 2.5,
        displayTime: 3000
    };

    let celebrationActive = false;

    // ============================================================================
    // ROUNDING MODE
    // ============================================================================
    function getRoundingMode() {
        const selected = document.querySelector('input[name="roundingMode"]:checked');
        if (!selected) return 'normal';
        return selected.value;
    }

    function applyRounding(value) {
        // Prevent recursion or weird cases (like NaN)
        if (typeof value !== 'number' || isNaN(value)) return 0;

        const mode = getRoundingMode();
        console.log("The Value is" + value)
        switch (mode) {
            case 'up':
                return Math.ceil(value);
            case 'down':
                return Math.floor(value);
            default:
                return Math.round(value);
        }
    }

    // ============================================================================
    // BOUNDARY MANAGEMENT
    // ============================================================================
    function getGradeDict() {
        return {
            [parseInt(elements.boundaries.first.value)]: '1st Class',
            [parseInt(elements.boundaries.upperSecond.value)]: '2.1 Upper Class',
            [parseInt(elements.boundaries.lowerSecond.value)]: '2.2 Lower Class',
            [parseInt(elements.boundaries.third.value)]: '3rd Class',
            [parseInt(elements.boundaries.fail.value)]: 'Marginal Fail',
            0: 'Fail'
        };
    }

    function updateTargetDropdown() {
        const currentValue = elements.targetInput.value;
        const b = elements.boundaries;

        elements.targetInput.innerHTML = `
            <option value="${b.first.value}">1st</option>
            <option value="${b.upperSecond.value}">2.1</option>
            <option value="${b.lowerSecond.value}">2.2</option>
            <option value="${b.third.value}">3rd</option>
        `;

        // Restore previous selection if it exists
        const matchingOption = Array.from(elements.targetInput.options)
            .find(opt => opt.value === currentValue);
        if (matchingOption) {
            elements.targetInput.value = currentValue;
        }
    }

    function resetBoundaries() {
        elements.boundaries.first.value = DEFAULT_BOUNDARIES['1st'];
        elements.boundaries.upperSecond.value = DEFAULT_BOUNDARIES['2.1'];
        elements.boundaries.lowerSecond.value = DEFAULT_BOUNDARIES['2.2'];
        elements.boundaries.third.value = DEFAULT_BOUNDARIES['3rd'];
        elements.boundaries.fail.value = DEFAULT_BOUNDARIES['fail'];
        updateTargetDropdown();
        updateTotals();
    }

    function gradeFromScore(score) {
        const gradeDict = getGradeDict();
        const thresholds = Object.keys(gradeDict).map(Number).sort((a, b) => b - a);
        return thresholds.find(t => score >= t) ? gradeDict[thresholds.find(t => score >= t)] : 'N/A';
    }

    // ============================================================================
    // VALIDATION UTILITIES
    // ============================================================================
    function isValidInteger(value, min = -Infinity, max = Infinity) {
        const num = parseFloat(value);
        return !isNaN(num) && Number.isInteger(num) && num >= min && num <= max;
    }

    function validateInput(input, errorElement, validationFn, errorClass = 'invalid') {
        const isValid = validationFn();
        errorElement.style.display = isValid ? 'none' : 'block';
        input.classList.toggle(errorClass, !isValid);
        return isValid;
    }

    // ============================================================================
    // ROW MANAGEMENT
    // ============================================================================
    function createRowHTML(rowIndex, score = '', maxScore = 100, weight = '') {
        return `
            <td>Assessment ${rowIndex}</td>
            <td>
                <input type="number" step="1" min="0" placeholder="Leave empty if not completed" value="${score}">
                <span class="error">Score must be between 0 and max score</span>
            </td>
            <td>
                <input type="number" step="1" min="1" value="${maxScore}">
                <span class="error">Max score must be positive</span>
            </td>
            <td>
                <input type="number" step="1" min="0" max="100" placeholder="0" value="${weight}">
                <span class="error">Weight must be between 0 and 100</span>
            </td>
            <td class="weighted">-</td>
            <td><button type="button" class="secondary removeBtn">✕</button></td>
        `;
    }

    function getRowInputs(row) {
        return {
            score: row.children[1].querySelector('input'),
            maxScore: row.children[2].querySelector('input'),
            weight: row.children[3].querySelector('input'),
            weightedCell: row.children[4],
            errors: {
                score: row.children[1].querySelector('.error'),
                maxScore: row.children[2].querySelector('.error'),
                weight: row.children[3].querySelector('.error')
            }
        };
    }

    function validateRowInputs(inputs) {
        const scoreVal = parseFloat(inputs.score.value);
        const maxVal = parseFloat(inputs.maxScore.value);
        const weightVal = parseFloat(inputs.weight.value) || 0;

        const validations = {
            maxScore: validateInput(
                inputs.maxScore,
                inputs.errors.maxScore,
                () => isValidInteger(inputs.maxScore.value, 1)
            ),
            weight: validateInput(
                inputs.weight,
                inputs.errors.weight,
                () => inputs.weight.value === '' || isValidInteger(weightVal, 0, 100)
            ),
            score: validateInput(
                inputs.score,
                inputs.errors.score,
                () => inputs.score.value === '' ||
                    (isValidInteger(scoreVal, 0, maxVal) && scoreVal <= maxVal)
            )
        };

        return {
            allValid: Object.values(validations).every(v => v),
            scoreVal,
            maxVal,
            weightVal
        };
    }

    function calculateWeightedScore(validation, inputs) {
        const { allValid, scoreVal, maxVal, weightVal } = validation;

        if (inputs.score.value !== '' && allValid && scoreVal >= 0) {
            const percentScore = (scoreVal / maxVal) * 100;
            const weightedScore = (percentScore * weightVal) / 100;
            inputs.weightedCell.textContent = applyRounding(weightedScore) + '%';
        } else {
            inputs.weightedCell.textContent = '-';
        }
    }

    function addRow(score = '', maxScore = 100, weight = '') {
        // Check max assessments limit
        if (elements.marksBody.children.length >= MAX_ASSESSMENTS) {
            return;
        }

        const tr = document.createElement('tr');
        const rowIndex = elements.marksBody.children.length + 1;
        tr.innerHTML = createRowHTML(rowIndex, score, maxScore, weight);
        elements.marksBody.appendChild(tr);

        const inputs = getRowInputs(tr);

        function autoUpdate() {
            const validation = validateRowInputs(inputs);
            calculateWeightedScore(validation, inputs);
            updateTotals();
        }

        // Attach event listeners
        [inputs.score, inputs.maxScore, inputs.weight].forEach(input => {
            input.addEventListener('input', autoUpdate);
        });

        tr.querySelector('.removeBtn').onclick = () => {
            tr.remove();
            renumberRows();
            updateTotals();
        };

        autoUpdate();
    }

    function renumberRows() {
        Array.from(elements.marksBody.children).forEach((row, i) => {
            row.children[0].textContent = `Assessment ${i + 1}`;
        });
    }

    // ============================================================================
    // CALCULATIONS
    // ============================================================================
    function getRowData(row) {
        const inputs = getRowInputs(row);
        return {
            scoreVal: parseFloat(inputs.score.value),
            maxVal: parseFloat(inputs.maxScore.value),
            weightVal: parseFloat(inputs.weight.value) || 0,
            scoreInput: inputs.score.value,
            hasErrors: !validateRowInputs(inputs).allValid
        };
    }

    function calculateTotals() {
        let totalWeight = 0;
        let totalWeightedScore = 0;
        let hasErrors = false;

        Array.from(elements.marksBody.querySelectorAll('tr')).forEach(row => {
            const data = getRowData(row);

            if (data.hasErrors) hasErrors = true;
            if (data.weightVal >= 0 && data.weightVal <= 100) totalWeight += data.weightVal;

            if (data.scoreInput !== '' && !data.hasErrors && data.scoreVal >= 0 && data.scoreVal <= data.maxVal) {
                totalWeightedScore += (data.scoreVal / data.maxVal * 100 * data.weightVal / 100);
            }
        });

        return { totalWeight, totalWeightedScore, hasErrors };
    }

    function updateTotals() {
        const { totalWeight, totalWeightedScore, hasErrors } = calculateTotals();

        elements.totalWeightCell.textContent = applyRounding(totalWeight) + '%';
        elements.totalWeightCell.style.color = Math.abs(totalWeight - 100) < 0.01 ? 'inherit' : '#fbbf24';

        elements.totalWeightedScoreCell.textContent = applyRounding(totalWeightedScore) + '%';
        elements.predictedGradeCell.textContent = gradeFromScore(totalWeightedScore);

        elements.calculateTargetBtn.disabled = hasErrors || Math.abs(totalWeight - 100) > 0.01;
        updateAddButtonState(totalWeight);
    }

    function updateAddButtonState(totalWeight) {
        const rowCount = elements.marksBody.children.length;
        const isAtMaxRows = rowCount >= MAX_ASSESSMENTS;
        const isAtMaxWeight = totalWeight >= 100;

        elements.addRowBtn.disabled = isAtMaxRows || isAtMaxWeight;

        // Show/hide error message
        if (!elements.addRowError) {
            // Create error element if it doesn't exist
            const errorSpan = document.createElement('span');
            errorSpan.id = 'addRowError';
            errorSpan.className = 'error';
            errorSpan.style.display = 'none';
            elements.addRowBtn.parentNode.appendChild(errorSpan);
            elements.addRowError = errorSpan;
        }

        if (isAtMaxRows) {
            elements.addRowError.textContent = `Cannot add more than ${MAX_ASSESSMENTS} assessments`;
            elements.addRowError.style.display = 'block';
        } else if (isAtMaxWeight) {
            elements.addRowError.textContent = 'Cannot add more (100% weight reached)';
            elements.addRowError.style.display = 'block';
        } else {
            elements.addRowError.style.display = 'none';
        }
    }

    // ============================================================================
    // TARGET PREDICTION
    // ============================================================================
    function getAssessmentData() {
        let totalWeightedScore = 0;
        let totalCompletedWeight = 0;
        const remainingAssessments = [];

        Array.from(elements.marksBody.querySelectorAll('tr')).forEach((row, i) => {
            const data = getRowData(row);

            if (data.scoreInput === '' || data.scoreInput === null) {
                if (data.weightVal > 0) {
                    remainingAssessments.push({
                        index: i + 1,
                        weight: data.weightVal,
                        maxScore: data.maxVal
                    });
                }
            } else if (!data.hasErrors && data.scoreVal <= data.maxVal) {
                totalWeightedScore += (data.scoreVal / data.maxVal * 100 * data.weightVal / 100);
                totalCompletedWeight += data.weightVal;
            }
        });

        return { totalWeightedScore, totalCompletedWeight, remainingAssessments };
    }

    function displayTargetResult(className, content, shouldCelebrate = false) {
        elements.targetOutput.className = `result ${className}`.trim();
        elements.targetOutput.innerHTML = content;
        elements.targetOutput.style.display = 'block';

        if (shouldCelebrate) triggerCelebration();

        setTimeout(() => {
            elements.targetOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    function generateTargetScenarios(remainingAssessments, pointsNeeded, targetGradePercent, gradeName) {
        if (remainingAssessments.length === 1) {
            return generateSingleAssessmentScenario(remainingAssessments[0], pointsNeeded);
        }
        return generateMultipleAssessmentScenarios(remainingAssessments, pointsNeeded);
    }

    function generateSingleAssessmentScenario(assessment, pointsNeeded) {
        const avgPercentNeeded = (pointsNeeded / assessment.weight) * 100;
        const scoreNeeded = applyRounding((avgPercentNeeded * assessment.maxScore / 100));

        const detail = avgPercentNeeded > 100
            ? `Target cannot be achieved (would need ${scoreNeeded}/${assessment.maxScore})`
            : `You need to score ${scoreNeeded} out of ${assessment.maxScore}`;

        return `<div class="option-box"><div class="option-title">Assessment ${assessment.index}:</div><div class="option-detail">${detail}</div></div>`;
    }

    function generateMultipleAssessmentScenarios(remainingAssessments, pointsNeeded) {
        let html = '<div style="margin:12px 0;font-weight:600;">Choose ONE of these options:</div>';

        // Generate scenarios for each assessment at 100%
        remainingAssessments.forEach((targetAssessment, targetIdx) => {
            html += generateScenarioOption(targetIdx + 1, targetAssessment, remainingAssessments, pointsNeeded);
        });

        // Add equal distribution scenario
        html += generateEqualDistributionScenario(remainingAssessments, pointsNeeded);

        return html;
    }

    function generateScenarioOption(optionNum, targetAssessment, allAssessments, pointsNeeded) {
        const remainingPoints = pointsNeeded - targetAssessment.weight;

        if (remainingPoints <= 0) {
            return `<div class="option-box"><div class="option-title">Option ${optionNum}:</div><div class="option-detail">Score 100% (${targetAssessment.maxScore}/${targetAssessment.maxScore}) on Assessment ${targetAssessment.index}</div></div>`;
        }

        const otherAssessments = allAssessments.filter(a => a.index !== targetAssessment.index);
        const otherTotalWeight = otherAssessments.reduce((sum, a) => sum + a.weight, 0);

        if (otherTotalWeight === 0) {
            return `<div class="option-box"><div class="option-title">Option ${optionNum}:</div><div class="option-detail">Cannot achieve target even with 100% on Assessment ${targetAssessment.index}</div></div>`;
        }

        const avgNeededOthers = (remainingPoints / otherTotalWeight) * 100;

        if (avgNeededOthers > 100) {
            return `<div class="option-box"><div class="option-title">Option ${optionNum}:</div><div class="option-detail">Score 100% on Assessment ${targetAssessment.index}, but still cannot achieve target</div></div>`;
        }

        let content = `<div class="option-detail">Score 100% (${targetAssessment.maxScore}/${targetAssessment.maxScore}) on Assessment ${targetAssessment.index}</div>`;
        otherAssessments.forEach(a => {
            const scoreNeeded = applyRounding((avgNeededOthers * a.maxScore / 100));
            content += `<div class="option-detail">AND ${scoreNeeded}/${a.maxScore} on Assessment ${a.index}</div>`;
        });

        return `<div class="option-box"><div class="option-title">Option ${optionNum}:</div>${content}</div>`;
    }

    function generateEqualDistributionScenario(remainingAssessments, pointsNeeded) {
        const totalWeight = remainingAssessments.reduce((sum, a) => sum + a.weight, 0);
        const avgPercentNeeded = (pointsNeeded / totalWeight) * 100;

        let content = '<div class="option-detail">Score equally across all assessments:</div>';
        remainingAssessments.forEach(a => {
            const scoreNeeded = applyRounding((avgPercentNeeded * a.maxScore / 100));
            const status = avgPercentNeeded > 100 ? ' (impossible)' : '';
            content += `<div class="option-detail">Assessment ${a.index}: ${scoreNeeded}/${a.maxScore}${status}</div>`;
        });

        return `<div class="option-box"><div class="option-title">Option (Equal Distribution):</div>${content}</div>`;
    }

    function updateTargetPrediction() {
        const { totalWeightedScore, totalCompletedWeight, remainingAssessments } = getAssessmentData();
        const targetGradePercent = parseFloat(elements.targetInput.value);
        const totalRemainingWeight = remainingAssessments.reduce((sum, a) => sum + a.weight, 0);
        const totalWeight = totalCompletedWeight + totalRemainingWeight;
        const gradeName = gradeFromScore(targetGradePercent);

        // Check total weight
        if (Math.abs(totalWeight - 100) > 0.01) {
            displayTargetResult('warning',
                `⚠️ Total weight is ${applyRounding(totalWeight)}% (should be 100%). Adjust weights before calculating target.`);
            return;
        }

        const maxPossibleScore = totalWeightedScore + totalRemainingWeight;

        // Check if target is impossible
        if (targetGradePercent > maxPossibleScore) {
            displayTargetResult('warning',
                `❌ Target of ${gradeName} (${targetGradePercent}%) cannot be achieved.\nMaximum possible: ${applyRounding(maxPossibleScore)}% (${gradeFromScore(maxPossibleScore)})`);
            return;
        }

        // Handle no remaining assessments
        if (remainingAssessments.length === 0) {
            if (totalWeightedScore < targetGradePercent) {
                displayTargetResult('warning',
                    `❌ Target of ${gradeName} (${targetGradePercent}%) cannot be achieved.\nCurrent score: ${applyRounding(totalWeightedScore)}% (${gradeFromScore(totalWeightedScore)})\nNo remaining assessments to improve.`);
            } else {
                displayTargetResult('',
                    `✓ Target of ${gradeName} already met with ${applyRounding(totalWeightedScore)}%!`, true);
            }
            return;
        }

        // Target already achieved
        if (totalWeightedScore >= targetGradePercent) {
            displayTargetResult('',
                `✓ Target of ${gradeName} already achieved with ${applyRounding(totalWeightedScore)}% congratulations!!!🥳`);
            return;
        }

        // Calculate scenarios
        const pointsNeeded = targetGradePercent - totalWeightedScore;
        const scenariosHTML = `
            <div style="margin-bottom:12px;">To achieve <strong>${gradeName}</strong> (${targetGradePercent}%), you need <strong>${applyRounding(pointsNeeded)}</strong> more percentage points.</div>
            ${generateTargetScenarios(remainingAssessments, pointsNeeded, targetGradePercent, gradeName)}
        `;

        displayTargetResult('', scenariosHTML);
    }

    // ============================================================================
    // CELEBRATION ANIMATION
    // ============================================================================
    function triggerCelebration() {
        if (celebrationActive) return;
        celebrationActive = true;

        elements.celebration.innerHTML = '';
        elements.celebration.style.display = 'block';
        elements.celebration.classList.remove('hidden');

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        for (let i = 0; i < CONFETTI_CONFIG.count; i++) {
            createConfetti(centerX, centerY);
        }

        setTimeout(() => {
            elements.celebration.style.display = 'none';
            celebrationActive = false;
        }, CONFETTI_CONFIG.displayTime);
    }

    function createConfetti(centerX, centerY) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');

        const size = Math.random() * (CONFETTI_CONFIG.maxSize - CONFETTI_CONFIG.minSize) + CONFETTI_CONFIG.minSize;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 80%, 60%)`;
        confetti.style.left = `${centerX}px`;
        confetti.style.top = `${centerY}px`;

        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * (CONFETTI_CONFIG.maxDistance - CONFETTI_CONFIG.minDistance) + CONFETTI_CONFIG.minDistance;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const rotation = Math.random() * 720 - 360;
        const duration = Math.random() * (CONFETTI_CONFIG.maxDuration - CONFETTI_CONFIG.minDuration) + CONFETTI_CONFIG.minDuration;

        confetti.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;

        setTimeout(() => {
            confetti.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
            confetti.style.opacity = 0;
        }, 50);

        elements.celebration.appendChild(confetti);
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    function clear() {
        elements.marksBody.innerHTML = '';
        elements.totalWeightCell.textContent = '-';
        elements.totalWeightedScoreCell.textContent = '-';
        elements.predictedGradeCell.textContent = '-';
        elements.targetOutput.style.display = 'none';
        elements.addRowBtn.disabled = false;
        if (elements.addRowError) {
            elements.addRowError.style.display = 'none';
        }
        addRow();
    }

    function initializeCollapsibleCards() {
        document.querySelectorAll('.card').forEach(card => {
            const header = card.querySelector('.card-header');
            const content = card.querySelector('.card-content');
            const icon = card.querySelector('.toggle-icon');

            content.classList.remove('collapsed');
            icon.classList.remove('collapsed');

            header.addEventListener('click', () => {
                content.classList.toggle('collapsed');
                icon.classList.toggle('collapsed');
            });
        });
    }

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================
    elements.targetInput.addEventListener('change', () => {
        elements.targetOutput.style.display = 'none';
    });

    Object.values(elements.boundaries).forEach(boundary => {
        boundary.addEventListener('input', () => {
            updateTargetDropdown();
            updateTotals();
        });
    });

    elements.resetBoundariesBtn.addEventListener('click', resetBoundaries);
    elements.calculateTargetBtn.addEventListener('click', updateTargetPrediction);
    elements.addRowBtn.addEventListener('click', () => addRow());
    elements.clearBtn.addEventListener('click', clear);

    // ============================================================================
    // ROUNDING MODE CHANGE LISTENER
    // ============================================================================
    document.querySelectorAll('input[name="roundingMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateTotals();
        });
    });

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    initializeCollapsibleCards();
    addRow();
});