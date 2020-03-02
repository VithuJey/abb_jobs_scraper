const puppeteer = require("puppeteer");
const json2xls = require("json2xls");
const axios = require("axios");
const fs = require("fs");

// URL to be scraped
let URL =
  "https://jobs.abb.com/sap/opu/odata/SAP/ZEREC_CUI_SEARCH_SRV/SearchSet?$expand=ToList";
let detailURL =
  "https://jobs.abb.com/sap/opu/odata/SAP/ZEREC_CUI_SEARCH_SRV/PostingInstanceSet?$expand=ToTasksList,ToReqList,ToBenefits&$filter=Details/ExternalCode%20eq";

// -----------------------------------------------------------
// Open the above URL in a browser's new page
const ping = async () => {
  const browser = await puppeteer.launch({
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setDefaultNavigationTimeout(0);
  return { page, browser };
};
const scrapeContent = async (page, pageURL) => {
  await page.goto(pageURL, { waitUntil: "load" });

  const jobJSON = await page.evaluate(async () => {
    let jobDetail = {};

    let title = document.querySelector(
      "div[id='__title0'] > span[id='__title0-inner']"
    );
    let location = document.querySelector(
      "td[id='__item4_cell1'] > span[id='__text11']"
    );
    let jobFunction = document.querySelector(
      "td[id='__item7_cell1'] > span[id='__text14']"
    );
    let postedDate = document.querySelector(
      "td[id='__item6_cell1'] > span[id='__text13']"
    );
    let businessUnit = document.querySelector(
      "td[id='__item5_cell1'] > span[id='__text12']"
    );
    let desc = document.querySelector("div[id='__text4']");
    let resp = document.querySelector("ul[id='__list1-listUl']");
    let back = document.querySelector("ul[id='__list2-listUl']");
    let benifits = document.querySelector("ul[id='__list3-listUl']");

    if (title != null) {
      jobDetail.title = title.innerHTML;
    }
    if (location != null) {
      location = location.innerHTML;
      if (location.split(",").length == 3) {
        let l = location.split(",");
        c = l[0] + ", " + l[1];
        l = l[2];
        jobDetail.city = c;
        jobDetail.country = l;
        console.log(l);
      } else {
        jobDetail.city = location.split(",")[0];
        jobDetail.country = location
          .split(",")
          .slice(1)
          .join(",");
      }
    }
    if (jobFunction != null) {
      jobDetail.jobFunction = jobFunction.innerHTML;
    }
    if (postedDate != null) {
      jobDetail.postedDate = postedDate.innerHTML;
    }
    if (businessUnit != null) {
      jobDetail.businessUnit = businessUnit.innerHTML;
    }
    if (desc != null) {
      jobDetail.desc = desc.innerText;
    }
    if (resp != null) {
      jobDetail.resp = resp.innerText.split("\n");
    }
    if (back != null) {
      jobDetail.back = back.innerText.split("\n");
    }
    if (benifits != null) {
      jobDetail.benifits = benifits.innerText.split("\n");
    }

    return jobDetail;
  });

  return jobJSON;
};
// -----------------------------------------------------------

// Job Titel, Country, City, Job Function, Type of Role, Date posted (or similar), Business Unit,
// Job posting text (e.g. role description, responsibilities, background)

// Evaluate & scrape
const scrape = async () => {
  let codes = await getExternalCode();
  manipulateToListJSON(codes);
};

const getNested = (obj, ...args) => {
  return args.reduce((obj, level) => obj && obj[level], obj);
};

const getCodeDetails = async job => {
  let details;
  // resp
  let ToReqListArr = [];
  // back
  let ToTasksListArr = [];
  // ben
  let ToBenefitsArr = [];

  await axios
    .get(detailURL + "'" + job.publication_id + "'")
    .then(res => (details = res.data.d.results[0]));

  if (getNested(details, "ToReqList", "results")) {
    let ToReqList = details.ToReqList.results[0];
    for (let resp of ToReqList) {
      ToReqListArr.push(resp.Item);
    }
  }

  if (getNested(details, "ToTasksList", "results")) {
    let ToTasksList = details.ToTasksList.results[0];
    for (let back of ToTasksList) {
      ToTasksListArr.push(back.Item);
    }
  }

  if (getNested(details, "ToBenefits", "results")) {
    let ToBenefits = details.ToBenefits.results[0];
    for (let ben of ToBenefits) {
      ToBenefitsArr.push(ben.Item);
    }
  }

  job.responsibilities = ToReqListArr;
  job.background = ToTasksListArr;
  job.benefits = ToBenefitsArr;

  return job;
};

const manipulateToListJSON = async codes => {
  let pageURL = "https://jobs.abb.com/jobsearch/?sap-language=EN#/posting/";

  let jobsArr = [];

  // console.log(codes);
  let i = 0;
  for (code of codes) {
    i++;
    if (i == 10) break;
    // console.log(code);

    job = {};

    if (code.hasOwnProperty("ExternalCode"))
      job.publication_id = code.ExternalCode;
    if (code.hasOwnProperty("Title")) job.title = code.Title;
    // if (code.hasOwnProperty("StartDate")) job.posted_date = Date(code.StartDate.split('/')[1]);
    if (code.hasOwnProperty("City")) job.city = code.City;
    if (code.hasOwnProperty("RegionTxt")) job.region = code.RegionTxt;
    if (code.hasOwnProperty("CountryTxt")) job.country = code.CountryTxt;
    if (code.hasOwnProperty("FunctionalAreaTxt"))
      job.functional_area = code.FunctionalAreaTxt;
    if (code.hasOwnProperty("HierarchyLevelTxt"))
      job.type_of_role = code.HierarchyLevelTxt;
    if (code.hasOwnProperty("Language")) job.language = code.Language;
    if (code.hasOwnProperty("ExternalCode"))
      job.web_link = pageURL + code.ExternalCode;
    if (code.hasOwnProperty("UrlPdf")) job.pdf_link = code.UrlPdf;

    job = getCodeDetails(job);

    jobsArr.push(job);
  }

  // Write to JSON
  let data = JSON.stringify(jobsArr, null, 2);
  fs.writeFile("Jobs_v0.2.json", data, err => {
    if (err) throw err;
    console.log("Data written to file");
  });

  // Write to excel
  const xls = await json2xls(jobsArr);
  fs.writeFileSync("Jobs_v0.2.xlsx", xls, "binary");
};

const getExternalCode = async () => {
  let dataArr;
  let externalCodes = [];

  await axios
    .get(URL)
    .then(res => (dataArr = res));
  console.log(dataArr)

  // Write to JSON
  // let data = JSON.stringify(dataArr, null, 2);
  fs.writeFile("response.json", dataArr, err => {
    if (err) throw err;
    console.log("Data written to file");
  });


// .data.d.results[0].ToList.results

  dataArr.forEach(data => {
    externalCodes.push(data);
  });


  return externalCodes;
};

scrape();
