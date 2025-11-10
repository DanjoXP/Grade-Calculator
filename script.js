
document.addEventListener('DOMContentLoaded', function () {
    const marksBody = document.getElementById('marksBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const targetInput = document.getElementById('target');
    const targetOutput = document.getElementById('targetOutput');
    const totalWeightCell = document.getElementById('totalWeight');
    const totalWeightedScoreCell = document.getElementById('totalWeightedScore');
    const predictedGradeCell = document.getElementById('predictedGrade');
    const clearBtn = document.getElementById('clearBtn');
    const calculateTargetBtn = document.getElementById('calculateTargetBtn');

    const boundary1st = document.getElementById('boundary1st');
    const boundary21 = document.getElementById('boundary21');
    const boundary22 = document.getElementById('boundary22');
    const boundary3rd = document.getElementById('boundary3rd');
    const boundaryFail = document.getElementById('boundaryFail');
    const resetBoundariesBtn = document.getElementById('resetBoundariesBtn');

    const defaultBoundaries = {
        '1st': 70,
        '2.1': 60,
        '2.2': 50,
        '3rd': 40,
        'fail': 30
    };

    function getGradeDict() {
        return {
            [parseInt(boundary1st.value)]: '1st Class',
            [parseInt(boundary21.value)]: '2.1 Upper Class',
            [parseInt(boundary22.value)]: '2.2 Lower Class',
            [parseInt(boundary3rd.value)]: '3rd Class',
            [parseInt(boundaryFail.value)]: 'Marginal Fail',
            0: 'Fail'
        };
    }

    function updateTargetDropdown() {
        const currentValue = targetInput.value;
        targetInput.innerHTML = `
          <option value="${boundary1st.value}">1st</option>
          <option value="${boundary21.value}">2.1</option>
          <option value="${boundary22.value}">2.2</option>
          <option value="${boundary3rd.value}">3rd</option>
        `;

        // Try to keep the same selection if it still exists
        const options = Array.from(targetInput.options);
        const matchingOption = options.find(opt => opt.value === currentValue);
        if (matchingOption) {
            targetInput.value = currentValue;
        }
    }

    function resetBoundaries() {
        boundary1st.value = defaultBoundaries['1st'];
        boundary21.value = defaultBoundaries['2.1'];
        boundary22.value = defaultBoundaries['2.2'];
        boundary3rd.value = defaultBoundaries['3rd'];
        boundaryFail.value = defaultBoundaries['fail'];
        updateTargetDropdown();
        updateTotals();
    }

    const gradeDict = {
        70: '1st Class',
        60: '2.1 Upper Class',
        50: '2.2 Lower Class',
        40: '3rd Class',
        30: 'Marginal Fail',
        0: 'Fail'
    };

    function addRow(score = '', maxScore = 100, weight = '') {
        const tr = document.createElement('tr');
        const rowIndex = marksBody.children.length + 1;
        tr.innerHTML = `
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
        marksBody.appendChild(tr);

        const scoreInput = tr.children[1].querySelector('input');
        const maxScoreInput = tr.children[2].querySelector('input');
        const weightInput = tr.children[3].querySelector('input');
        const weightedCell = tr.children[4];
        const errorSpan = tr.children[3].querySelector('.error');
        const errorScore = tr.children[1].querySelector('.error');
        const errorMax = tr.children[2].querySelector('.error');

        function autoUpdate() {
            const scoreVal = parseFloat(scoreInput.value);
            const maxVal = parseFloat(maxScoreInput.value);
            const weightVal = parseFloat(weightInput.value) || 0;

            // Validate max score
            let maxValid = true;
            if (maxVal < 1 || isNaN(maxVal) || !Number.isInteger(maxVal)) {
                errorMax.style.display = 'block';
                maxScoreInput.classList.add('invalid');
                maxValid = false;
            } else {
                errorMax.style.display = 'none';
                maxScoreInput.classList.remove('invalid');
            }

            // Validate weight
            let weightValid = true;
            if (weightVal > 100 || weightVal < 0 || (weightInput.value !== '' && !Number.isInteger(weightVal))) {
                errorSpan.style.display = 'block';
                weightInput.classList.add('invalid');
                weightValid = false;
            } else {
                errorSpan.style.display = 'none';
                weightInput.classList.remove('invalid');
            }

            // Validate score
            let scoreValid = true;
            if (scoreInput.value !== '') {
                if (scoreVal < 0 || scoreVal > maxVal || !Number.isInteger(scoreVal)) {
                    errorScore.style.display = 'block';
                    scoreInput.classList.add('invalid');
                    scoreValid = false;
                } else {
                    errorScore.style.display = 'none';
                    scoreInput.classList.remove('invalid');
                }
            } else {
                errorScore.style.display = 'none';
                scoreInput.classList.remove('invalid');
            }

            // Calculate weighted score
            if (scoreInput.value !== '' && !isNaN(scoreVal) && !isNaN(maxVal) && maxVal >= 1 && weightValid && scoreValid && maxValid && scoreVal >= 0) {
                const percentScore = (scoreVal / maxVal) * 100;
                const weightedScore = (percentScore * weightVal) / 100;
                weightedCell.textContent = Math.round(weightedScore) + '%';
            } else {
                weightedCell.textContent = '-';
            }

            updateTotals();
        }

        scoreInput.addEventListener('input', autoUpdate);
        maxScoreInput.addEventListener('input', autoUpdate);
        weightInput.addEventListener('input', autoUpdate);

        tr.querySelector('.removeBtn').onclick = () => {
            tr.remove();
            Array.from(marksBody.children).forEach((r, i) => {
                r.children[0].textContent = `Assessment ${i + 1}`;
            });
            updateTotals();
        };

        autoUpdate();
    }

    function updateTotals() {
        let totalWeight = 0;
        let totalWeightedScore = 0;
        let hasErrors = false;

        const rows = marksBody.querySelectorAll('tr');
        rows.forEach(r => {
            const sInput = r.children[1].querySelector('input');
            const sVal = parseFloat(sInput.value);
            const mInput = r.children[2].querySelector('input');
            const mVal = parseFloat(mInput.value);
            const wInput = r.children[3].querySelector('input');
            const wVal = parseFloat(wInput.value) || 0;

            // Check for any errors
            if (wVal > 100 || wVal < 0 || mVal < 1 || isNaN(mVal)) {
                hasErrors = true;
            }
            if (wInput.value !== '' && !Number.isInteger(wVal)) {
                hasErrors = true;
            }
            if (mInput.value !== '' && !Number.isInteger(mVal)) {
                hasErrors = true;
            }
            if (sInput.value !== '' && (sVal < 0 || sVal > mVal || !Number.isInteger(sVal))) {
                hasErrors = true;
            }

            if (!isNaN(wVal) && wVal <= 100 && wVal >= 0) totalWeight += wVal;
            if (sInput.value !== '' && !isNaN(sVal) && sVal >= 0 && !isNaN(mVal) && mVal >= 1 && wVal <= 100 && wVal >= 0 && sVal <= mVal) {
                totalWeightedScore += (sVal / mVal * 100 * wVal / 100);
            }
        });

        totalWeightCell.textContent = Math.round(totalWeight) + '%';
        totalWeightCell.style.color = Math.abs(totalWeight - 100) < 0.01 ? 'inherit' : '#fbbf24';

        totalWeightedScoreCell.textContent = Math.round(totalWeightedScore) + '%';
        predictedGradeCell.textContent = gradeFromScore(totalWeightedScore);

        // Disable calculate button if there are errors
        calculateTargetBtn.disabled = hasErrors;

        toggleAddButton();
        toggleCalculateButton();
    }

    function gradeFromScore(score) {
        const currentGradeDict = getGradeDict();
        const thresholds = Object.keys(currentGradeDict).map(Number).sort((a, b) => b - a);
        for (let t of thresholds) {
            if (score >= t) return currentGradeDict[t];
        }
        return 'N/A';
    }

    function updateTargetPrediction() {
        let totalWeightedScore = 0;
        let totalCompletedWeight = 0;
        const remainingAssessments = [];

        const rows = marksBody.querySelectorAll('tr');
        rows.forEach((r, i) => {
            const scoreInput = r.children[1].querySelector('input');
            const scoreVal = scoreInput.value;
            const maxScore = parseFloat(r.children[2].querySelector('input').value);
            const weight = parseFloat(r.children[3].querySelector('input').value) || 0;

            if (scoreVal === '' || scoreVal === null) {
                if (weight > 0) {
                    remainingAssessments.push({ index: i + 1, weight, maxScore });
                }
            } else {
                const sVal = parseFloat(scoreVal);
                if (!isNaN(sVal) && !isNaN(maxScore) && maxScore > 0 && sVal <= maxScore) {
                    totalWeightedScore += (sVal / maxScore * 100 * weight / 100);
                    totalCompletedWeight += weight;
                }
            }
        });

        const targetGradePercent = parseFloat(targetInput.value);
        const totalRemainingWeight = remainingAssessments.reduce((sum, a) => sum + a.weight, 0);
        const totalWeight = totalCompletedWeight + totalRemainingWeight;

        if (Math.abs(totalWeight - 100) > 0.01) {
            targetOutput.className = 'result warning';
            targetOutput.textContent = `⚠️ Total weight is ${Math.round(totalWeight)}% (should be 100%). Adjust weights before calculating target.`;
            targetOutput.style.display = 'block';
            return;
        }

        const maxPossibleScore = totalWeightedScore + totalRemainingWeight;
        const gradeName = gradeFromScore(targetGradePercent);

        // Check if target is impossible (even with 100% on remaining assessments)
        if (targetGradePercent > maxPossibleScore) {
            targetOutput.className = 'result warning';
            targetOutput.textContent = `❌ Target of ${gradeName} (${targetGradePercent}%) cannot be achieved.\nMaximum possible: ${Math.round(maxPossibleScore)}% (${gradeFromScore(maxPossibleScore)})`;
            targetOutput.style.display = 'block';
            return;
        }

        // Also show target prediction even with no remaining assessments
        if (remainingAssessments.length === 0) {
            if (totalWeightedScore < targetGradePercent) {
                targetOutput.className = 'result warning';
                targetOutput.textContent = `❌ Target of ${gradeName} (${targetGradePercent}%) cannot be achieved.\nCurrent score: ${Math.round(totalWeightedScore)}% (${gradeFromScore(totalWeightedScore)})\nNo remaining assessments to improve.`;
                targetOutput.style.display = 'block';
            } else {
                targetOutput.className = 'result';
                targetOutput.textContent = `✓ Target of ${gradeName} already met with ${Math.round(totalWeightedScore)}%!`;
                targetOutput.style.display = 'block';
            }
            return;
        }

        if (totalWeightedScore >= targetGradePercent) {
            targetOutput.className = 'result';
            targetOutput.textContent = `✓ Target of ${gradeName} already achieved with ${Math.round(totalWeightedScore)}%!`;
            targetOutput.style.display = 'block';
            return;
        }

        // Calculate what's needed across remaining assessments
        const pointsNeeded = targetGradePercent - totalWeightedScore;
        const avgPercentNeeded = (pointsNeeded / totalRemainingWeight) * 100;

        let messagesHTML = `<div style="margin-bottom:12px;">To achieve <strong>${gradeName}</strong> (${targetGradePercent}%), you need <strong>${Math.round(pointsNeeded)}</strong> more percentage points.</div>`;

        if (remainingAssessments.length === 1) {
            const a = remainingAssessments[0];
            const scoreNeeded = Math.round((avgPercentNeeded * a.maxScore / 100));
            if (avgPercentNeeded > 100) {
                messagesHTML += `<div class="option-box"><div class="option-title">Assessment ${a.index}:</div><div class="option-detail">Target cannot be achieved (would need ${scoreNeeded}/${a.maxScore})</div></div>`;
            } else {
                messagesHTML += `<div class="option-box"><div class="option-title">Assessment ${a.index}:</div><div class="option-detail">You need to score ${scoreNeeded} out of ${a.maxScore}</div></div>`;
            }
        } else {
            messagesHTML += `<div style="margin:12px 0;font-weight:600;">Choose ONE of these options:</div>`;

            // Generate different scenarios
            remainingAssessments.forEach((targetAssessment, targetIdx) => {
                const maxContribution = targetAssessment.weight;
                const remainingPoints = pointsNeeded - maxContribution;

                if (remainingPoints <= 0) {
                    messagesHTML += `<div class="option-box"><div class="option-title">Option ${targetIdx + 1}:</div><div class="option-detail">Score 100% (${targetAssessment.maxScore}/${targetAssessment.maxScore}) on Assessment ${targetAssessment.index}</div></div>`;
                } else {
                    const otherAssessments = remainingAssessments.filter((_, idx) => idx !== targetIdx);
                    const otherTotalWeight = otherAssessments.reduce((sum, a) => sum + a.weight, 0);

                    if (otherTotalWeight === 0) {
                        messagesHTML += `<div class="option-box"><div class="option-title">Option ${targetIdx + 1}:</div><div class="option-detail">Cannot achieve target even with 100% on Assessment ${targetAssessment.index}</div></div>`;
                    } else {
                        const avgNeededOthers = (remainingPoints / otherTotalWeight) * 100;

                        if (avgNeededOthers > 100) {
                            messagesHTML += `<div class="option-box"><div class="option-title">Option ${targetIdx + 1}:</div><div class="option-detail">Score 100% on Assessment ${targetAssessment.index}, but still cannot achieve target</div></div>`;
                        } else {
                            let optionContent = `<div class="option-detail">Score 100% (${targetAssessment.maxScore}/${targetAssessment.maxScore}) on Assessment ${targetAssessment.index}</div>`;
                            otherAssessments.forEach(a => {
                                const scoreNeeded = Math.round((avgNeededOthers * a.maxScore / 100));
                                optionContent += `<div class="option-detail">AND ${scoreNeeded}/${a.maxScore} on Assessment ${a.index}</div>`;
                            });
                            messagesHTML += `<div class="option-box"><div class="option-title">Option ${targetIdx + 1}:</div>${optionContent}</div>`;
                        }
                    }
                }
            });

            // Add the "equal distribution" scenario
            let equalContent = '';
            remainingAssessments.forEach(a => {
                const scoreNeeded = Math.round((avgPercentNeeded * a.maxScore / 100));
                if (avgPercentNeeded > 100) {
                    equalContent += `<div class="option-detail">Assessment ${a.index}: Would need ${scoreNeeded}/${a.maxScore} (impossible)</div>`;
                } else {
                    equalContent += `<div class="option-detail">Assessment ${a.index}: ${scoreNeeded}/${a.maxScore}</div>`;
                }
            });
            messagesHTML += `<div class="option-box"><div class="option-title">Option (Equal Distribution):</div><div class="option-detail">Score equally across all assessments:</div>${equalContent}</div>`;
        }

        targetOutput.className = 'result';
        targetOutput.innerHTML = messagesHTML;
        targetOutput.style.display = 'block';
    }

    function toggleAddButton() {
        const totalWeight = Array.from(marksBody.querySelectorAll('tr')).reduce((sum, row) => {
            const weightVal = parseFloat(row.children[3].querySelector('input').value) || 0;
            return sum + (weightVal <= 100 ? weightVal : 0);
        }, 0);
        addRowBtn.disabled = totalWeight >= 100;
    }

    function toggleCalculateButton() {
    const totalWeight = Array.from(marksBody.querySelectorAll('tr')).reduce((sum, row) => {
        const weightVal = parseFloat(row.children[3].querySelector('input').value) || 0;
        return sum + weightVal;
    }, 0);

    // Enable only if total weight is exactly 100
    calculateTargetBtn.disabled = Math.abs(totalWeight - 100) > 0.01;
}


    function clear() {
        marksBody.innerHTML = '';
        totalWeightCell.textContent = '-';
        totalWeightedScoreCell.textContent = '-';
        predictedGradeCell.textContent = '-';
        targetOutput.style.display = 'none';
        addRowBtn.disabled = false;
        addRow();
    }

    targetInput.addEventListener('change', () => {
        targetOutput.style.display = 'none';
    });

    // Update calculations when boundaries change
    boundary1st.addEventListener('input', () => { updateTargetDropdown(); updateTotals(); });
    boundary21.addEventListener('input', () => { updateTargetDropdown(); updateTotals(); });
    boundary22.addEventListener('input', () => { updateTargetDropdown(); updateTotals(); });
    boundary3rd.addEventListener('input', () => { updateTargetDropdown(); updateTotals(); });
    boundaryFail.addEventListener('input', updateTotals);

    resetBoundariesBtn.addEventListener('click', resetBoundaries);

    calculateTargetBtn.addEventListener('click', updateTargetPrediction);
    addRowBtn.addEventListener('click', () => addRow());
    clearBtn.addEventListener('click', clear);

    // Collapsible card functionality
    document.querySelectorAll('.card').forEach(card => {
    const header = card.querySelector('.card-header');
    const content = card.querySelector('.card-content');
    const icon = card.querySelector('.toggle-icon');

    // Start expanded by default
    content.classList.remove('collapsed');
    icon.classList.remove('collapsed');

    header.addEventListener('click', () => {
        content.classList.toggle('collapsed');
        icon.classList.toggle('collapsed');
    });
});


    // Initialize with one empty row
    addRow();
});