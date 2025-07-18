// PRELIMINARIES:

// Detect in-browser viewport dimensions
const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);


// GLOBALLY USED CONSTS & VARS:

/* global i */

const mainTable = document.querySelector('#mainTable');
const myTotalsTable = document.querySelector('#totalsTable');
const myTotalTipsInputTable = document.querySelector('#totalTipsInputTable');
const myInputTips = document.getElementById('inputTips');
const myTipRateTable = document.getElementById('tipRateTable');
const myPeepIcon = document.querySelector("#icon img");
const myInfoIcon = document.querySelector("#help");
const myDimmer = document.getElementById("dimmer");
let mySpeechBubble = [];
for (i=0; i<5; i++) {
  mySpeechBubble[i] = document.getElementById("speechBubble_"+(i+1));
}
let myCreditsTimer;
let initialRowCount = Math.floor(vh/50);
let infoScreen = false;


// FUNCTIONS SECTION BELOW:

function RoundingSuggestion(tipRate, hoursWorked, totalHours) {
    var totalTips = Math.floor(Number(myInputTips.value));
    var roundingFloor = 0.5;
    var sumRoundedTips = 0;
    var lowerBound = 0;
    var upperBound = 1;
    var iterations = 0;
    var numHoursWorked = 0;
    // Just in case, some error handling:
    if ((totalHours === 0) || (totalTips <= 0) || (isNaN(totalTips))) {
        return roundingFloor;    
    }
    // Iterate using increasingly better roundingFloors till sum of individually 
    // rounded tips = total tip count, but limit iterations to, say, 50, just in case
    while ((sumRoundedTips !== totalTips) && (iterations < 50)) {
        iterations += 1;
        sumRoundedTips = 0;
        for (i = 0; i < hoursWorked.length; i++) { 
            numHoursWorked = Number(hoursWorked[i].value);
            sumRoundedTips += Math.floor(numHoursWorked*tipRate) + Math.floor(((numHoursWorked*tipRate) - Math.floor(numHoursWorked*tipRate))/roundingFloor);
        }
        if (sumRoundedTips < totalTips) {
            upperBound = roundingFloor; 
            roundingFloor = lowerBound + ((upperBound - lowerBound)/2);
        }
        if (sumRoundedTips > totalTips) {
            lowerBound = roundingFloor;
            roundingFloor = lowerBound + ((upperBound - lowerBound)/2);
        }  
    }
    // And now, a second approach in case we were unable to find a roundFloor that
    // distributes all tips, or in case we need to handle certain edge situations:
    if (sumRoundedTips !== totalTips) {
        // Start off by trying a generous or low rounding floor
        roundingFloor = lowerBound/2;
        sumRoundedTips = 0;
        for (i = 0; i < hoursWorked.length; i++) {
            numHoursWorked = Number(hoursWorked[i].value);
            sumRoundedTips += Math.floor(numHoursWorked*tipRate) + Math.floor(((numHoursWorked*tipRate) - Math.floor(numHoursWorked*tipRate))/roundingFloor);
        }
        // If the sum of rounded tips using a generous rounding floor is too high, keep raising the latter till
        // the sum of rounded tips is no longer larger than the actual total tips available for distribution:
        while (sumRoundedTips > totalTips) {
            sumRoundedTips = 0;
            for (i = 0; i < hoursWorked.length; i++) {
                numHoursWorked = Number(hoursWorked[i].value);
                sumRoundedTips += Math.floor(numHoursWorked*tipRate) + Math.floor(((numHoursWorked*tipRate) - Math.floor(numHoursWorked*tipRate))/roundingFloor);
            }
            roundingFloor += 0.005;
        }
    }
    // And finally, return a roundingFloor suggestion!
    return roundingFloor;
}

function updateTable(e) {
    // First, validate input content:
    if (isNaN(Number(e.target.value)) || (Number(e.target.value) < 0)) { 
        e.target.value = '';        
    }   
    // Update total hours worked:
    const myHours = mainTable.querySelectorAll('input');
    const myTotalHours = document.getElementById('totalHours');
    let runningTotal = 0;
    for (i=0; i < myHours.length; i++) {
        if (Number(myHours[i].value) > 0) {
            runningTotal += Number(myHours[i].value);
        }
    }
    if (runningTotal > 0) {
        myTotalHours.textContent = runningTotal.toFixed(2);
    } else {
        myTotalHours.textContent = "";
    }
    // Update calculated hourly tip rate (if total tips this week has been input and
    // if total hours worked > 0):
    const myHourlyRate = document.getElementById('hourlyRate');
    var myCurrentRate = 0;
    if (!isNaN(Number(myInputTips.value)) && (Number(myInputTips.value) > 0) && (runningTotal > 0)) {
        myCurrentRate = (Number(myInputTips.value) / runningTotal).toFixed(9);
        myHourlyRate.textContent = myCurrentRate;
        myTipRateTable.hidden = false;
    } else {
        myHourlyRate.textContent = "";
        myTipRateTable.hidden = true;
    }
    // Loop through & update all individual tip cells:
    if (myCurrentRate > 0) {
        // Call RoundingSuggestion to determine (& return) optimal rounding floor.
        // (Pass to it: current tip rate, individual hours array, & all hours worked total.) 
        var roundingFloor = RoundingSuggestion(myCurrentRate, myHours, runningTotal);
        for (i=0; i < myHours.length; i++) {
            var myAdjacentTip = document.getElementById('tips'+(i+1));
            if (!isNaN(Number(myHours[i].value)) && (Number(myHours[i].value) > 0)) {
                var optimalRoundedTip = Math.floor(Number(myHours[i].value)*myCurrentRate) + Math.floor(((Number(myHours[i].value)*myCurrentRate) - Math.floor(Number(myHours[i].value)*myCurrentRate))/roundingFloor);
                myAdjacentTip.textContent = "$" + optimalRoundedTip;
            }
        }
    } else {
        for (i=0; i < myHours.length; i++) {
            var myAdjacentTip = document.getElementById('tips'+(i+1));
            myAdjacentTip.textContent = "";    
        }
    }
    // Add up & show total of all (rounded) individual tips earned: 
    runningTotal = 0;
    for (i=0; i < myHours.length; i++) {
        var tipsDataElement = document.getElementById('tips'+(i+1));
        if (!isNaN(Number(tipsDataElement.textContent.substring(1)))) {
            runningTotal += Number(tipsDataElement.textContent.substring(1));            
        }    
    }
    const myTotalTips = document.getElementById('totalTips');
    if (runningTotal > 0) {
        myTotalTips.textContent = "$"+runningTotal.toFixed(0);
    } else {
        myTotalTips.textContent = "";
    }
}

function createNewRows(startingPoint, endingPoint) {
    for (i=startingPoint; i < (endingPoint+1); i++) {
        const newRow = document.createElement('tr');
        const newHeader = document.createElement('th');
        const newDataCol_1 = document.createElement('td');
        const newDataCol_2 = document.createElement('td');
        const newInput = document.createElement('input');
    
        newHeader.setAttribute('class', "unselectable");
        newHeader.textContent = i;
    
        newInput.setAttribute('id', i);
        if (i === 1) {
            newInput.setAttribute('placeholder', "Fill in");
        }
        if (i > 1) {
            newInput.setAttribute('placeholder', "...");
        }
        
        newDataCol_1.setAttribute('id', "hours"+i);
        newDataCol_2.setAttribute('id', "tips"+i);
        newDataCol_2.textContent = "";
    
        mainTable.appendChild(newRow);
        newRow.appendChild(newHeader);
        newRow.appendChild(newDataCol_1);
        newRow.appendChild(newDataCol_2);
        newDataCol_1.appendChild(newInput);
        
        newInput.addEventListener('change', updateTable);
    }
}

function peepClick() {
    if ((myPeepIcon.style.opacity == 1) && !(infoScreen)) {
        myPeepIcon.style.opacity = 0.25;
        var myHourRows = mainTable.querySelectorAll('input');
        var myNextRowID = myHourRows.length+1;
        if (myNextRowID < 100) {
            createNewRows(myNextRowID, myNextRowID);
        }
        window.setTimeout (function () { 
            myPeepIcon.style.opacity = 1;
        }, 50);
    }
}

function infoToggle() {
    if (infoScreen) {
        // Gray out all tables using "Dimmer" element
        if (myTipRateTable.hidden === true) {
            var dimmerHeight = 1 + myTotalTipsInputTable.getBoundingClientRect().bottom - mainTable.getBoundingClientRect().top;
        } else {
            var dimmerHeight = 1 + myTipRateTable.getBoundingClientRect().bottom - mainTable.getBoundingClientRect().top;
        }
        myDimmer.setAttribute('style',"position: relative; left: -50%;height:"+dimmerHeight+"px;");
        myDimmer.hidden = false;
        // Display info bubbles
            // Speech bubble 1:
        mySpeechBubble[0].setAttribute('class', "speech-bubble unselectable animate__animated animate__bounceIn");
        mySpeechBubble[0].hidden = false;
            // Speech bubble 2:
        mySpeechBubble[1].setAttribute('class', "speech-bubble unselectable animate__animated animate__bounceIn animate__delay-1s");
        mySpeechBubble[1].hidden = false;
            // Speech bubble 3:
        mySpeechBubble[2].setAttribute('class', "speech-bubble unselectable animate__animated animate__bounceIn animate__delay-2s");
        mySpeechBubble[2].hidden = false;
            // Speech bubble 4:
        myCreditsTimer = window.setTimeout (function () {
            mySpeechBubble[3].setAttribute('class', "speech-bubble unselectable animate__animated animate__fadeInLeft");
            mySpeechBubble[3].hidden = false;
        }, 3000);    
    } else {
        // Ungray all tables
        myDimmer.hidden = true;
        // Hide all info bubbles
        for (i=0; i<4; i++) {
          mySpeechBubble[i].hidden = true;
          mySpeechBubble[i].setAttribute('class', "speech-bubble unselectable");
        }       
        clearTimeout(myCreditsTimer);       
    }
}

function infoClick() {
    if (!infoScreen) {
        infoScreen = true;
        myInfoIcon.style.backgroundColor = "rgb(140, 180, 249)";
        myInfoIcon.style.textShadow = "none";
        myInfoIcon.style.color = "rgb(0, 0, 0)";
        myInfoIcon.style.border = "1px solid rgb(140, 180, 249)";
        infoToggle();
        // Listen for any click anywhere to make info screen "click off"
        window.setTimeout (function () {
            document.addEventListener('click', infoClick);
        }, 200);
    } else {
        infoScreen = false;
        document.removeEventListener('click', infoClick);
        myInfoIcon.style.backgroundColor = "rgb(92, 139, 222)";
        myInfoIcon.style.textShadow = "1px 0px 0px rgba(0, 0, 0, 0.75)";
        myInfoIcon.style.color = "rgb(255, 255, 255)";
        myInfoIcon.style.border = "1px solid rgb(140, 180, 249)";
        infoToggle();
    }
}

function removeHelpBubble() {
    mySpeechBubble[4].setAttribute('class', "speech-bubble unselectable animate__animated animate__fadeOut animate__faster");
    document.removeEventListener('click', removeHelpBubble);
//    clearTimeout(removeHelpTimer);
    window.setTimeout (function () {
            mySpeechBubble[4].hidden = true;
        }, 3000);    
}

// END OF FUNCTIONS SECTION


// MAIN BODY OF CODE BELOW:

// Initializations:

// Create initial table rows (+ input fields, event handlers, IDs, etc.) 
// fitting inside browser window
if (initialRowCount < 9) {initialRowCount = 9;}
createNewRows(1, (initialRowCount+1));

// Clear total tips input field
myInputTips.value = '';

// Style & adjust peep icon
myPeepIcon.setAttribute('draggable', "false");
myPeepIcon.style.opacity = 1;
myPeepIcon.addEventListener('animationend', () => {
   myPeepIcon.setAttribute('class', "");
});

// Show initial "Add rows" speech bubble & then listen for any click anywhere to make it go away
mySpeechBubble[4].setAttribute('class', "speech-bubble unselectable animate__animated animate__fadeIn animate__delay-2s");
mySpeechBubble[4].hidden = false;
document.addEventListener('click', removeHelpBubble);
//let removeHelpTimer = window.setTimeout (function () {
//            removeHelpBubble();
//        }, 8000);  

// Event handling:

// Listen for changes on 'Total tips this week' input field
myInputTips.addEventListener('change', updateTable); 

// Listen for clicks on peep icon
myPeepIcon.addEventListener('click', peepClick);

// Listen for clicks on info icon
myInfoIcon.addEventListener('click', infoClick);

// Listen for enter key to tab to next input
window.onkeydown = function(e) {
    if (e.which == 13 && document.activeElement.tagName === "INPUT") {
        var inputs = document.querySelectorAll('input');
        var nextIndex = document.activeElement.id;
        if (nextIndex === "inputTips") {
            window.setTimeout(function () { 
                document.activeElement.blur(); 
            }, 0);
        } else {       
            window.setTimeout(function () { 
                inputs[nextIndex].focus(); 
            }, 0);
        }            
    }
};
