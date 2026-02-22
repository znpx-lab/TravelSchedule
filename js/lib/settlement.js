function calculateSettlement(expenses, participantCount) {
    const splitSum = (expenses || []).reduce((s, e) => (e && e.isSplit !== false) ? s + (Number(e.amount) || 0) : s, 0);
    const nonSplitSum = (expenses || []).reduce((s, e) => (e && e.isSplit === false) ? s + (Number(e.amount) || 0) : s, 0);

    const splitPer = Math.floor(splitSum / participantCount);
    const remainder = splitSum - (splitPer * participantCount);
    const perPerson = splitPer + nonSplitSum;

    return { splitSum, nonSplitSum, splitPer, perPerson, remainder };
}

module.exports = { calculateSettlement };