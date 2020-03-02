// "use strict";

// let date = '/Date(1582934400000)/'
// console.log(Date(date.split('/')[1]))

let obj = {
  name: "asasas",
  ty: {
    ho: {
      jo: []
    },
    to: 5
  }
};

// to check the availability of a key in a nested JSON
function getNested(obj, ...args) {
  return args.reduce((obj, level) => obj && obj[level], obj);
}

if (getNested(obj, "ty", "to")) console.log("true");
