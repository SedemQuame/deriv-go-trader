// Sample Custom Strategy: Digit Counter
// Buys DIGITODD if the last digit is Even
// Buys DIGITEVEN if the last digit is Odd

function onTick(quote) {
    // Current price
    // Convert to string to safely get last digit
    // We assume quote is a number
    var priceStr = quote.toString();

    // Simple way to get last numeric digit from string representation
    // This handles decimals e.g. 123.45 -> '5'
    var lastChar = priceStr.charAt(priceStr.length - 1);
    var lastDigit = parseInt(lastChar);

    // Check if it's a number (handling potential non-digit last chars if any)
    if (isNaN(lastDigit)) {
        return;
    }

    log("Tick: " + quote + " (Last Digit: " + lastDigit + ")");

    var stake = getInitialStake();

    // Simple logic:
    // If last digit is even (0, 2, 4, 6, 8), buy ODD
    if (lastDigit % 2 === 0) {
        log("Last digit is Even (" + lastDigit + "). Buying DIGITODD...");
        buy("DIGITODD", stake);
    }
    // If last digit is odd (1, 3, 5, 7, 9), buy EVEN
    else {
        log("Last digit is Odd (" + lastDigit + "). Buying DIGITEVEN...");
        buy("DIGITEVEN", stake);
    }
}
