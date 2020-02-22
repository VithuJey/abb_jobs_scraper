const puppeteer = require("puppeteer");
// const json2xls = require("json2xls");
const fs = require("fs");

// URL to be scraped
let URL = "https://jobs.abb.com/jobsearch/?sap-language=EN#"
//   "https://jobs.abb.com/jobsearch/?sap-language=EN";

// Open the above URL in a browser's new page
const ping = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 926 });
  await page.setDefaultNavigationTimeout(0);
  await page.goto(URL, { waitUntil: "load" });
  return { page, browser };
};

// Evaluate & scrape
const scrape = async () => {
    const { page, browser } = await ping();
    // let jobDetail = await scrapeContent(page);
    // console.log(jobDetail);
    // const visible = await loadMore(page);
    // console.log(visible);

    
    // await page.click("__link3-__clone0");
    await page.evaluate(() => {
      document.querySelector("a[id='__link3-__clone0']").click
    });
    // document.querySelector("a[id='__link3-__clone0']")
    await page.waitForNavigation();
    browser.close();
}

const loadMore = async (page) => {
  await page.evaluate(() => {
    document.querySelector("li[id='__component0---map_search--tableJobs-trigger']").click;
  });
  // await page.click("li[id='__component0---map_search--tableJobs-trigger']");
  let visible = true;
  // await page
  //   .waitForSelector('#__component0---map_search--tableJobs-trigger', { visible: true, timeout: 2000 })
  //   .catch(() => {
  //     visible = false;
  //   });
  return visible;
  
}

const scrapeLink = async () => {
  const links = await page.evaluate(() => {
    let linkArr = [];


  })

  return links;
}

// Job Titel, Country, City, Job Function, Type of Role, Date posted (or similar), Business Unit,
// Job posting text (e.g. role description, responsibilities, background)

const scrapeContent = async (page) => {
  const jobJSON = await page.evaluate(async () => {
    let jobDetail = {};

    let title = document.querySelector("div[id='__title0'] > span[id='__title0-inner']");
    let location = document.querySelectorAll("td[class='sapMListTblCell'] > span[class='sapMText sapMTextMaxWidth sapUITinyMarginEnd sapUiSelectable']")[0];
    let jobFunction =  document.querySelectorAll("td[class='sapMListTblCell'] > span[class='sapMText sapMTextMaxWidth sapUITinyMarginEnd sapUiSelectable']")[1];
    let postedDate = document.querySelectorAll("td[class='sapMListTblCell'] > span[class='sapMText sapMTextBreakWord sapMTextMaxWidth sapUITinyMarginEnd sapUiSelectable']")[0];
    let businessUnit = document.querySelector("td[class='sapMListTblCell'] > span[class='sapMText sapMTextMaxWidth sapUiSelectable']");
    let desc = document.querySelectorAll("div[class='jobdescription_subtitle sapMFT']")[1];
    let resp = document.querySelector("ul[id='__list1-listUl']");
    let back = document.querySelector("ul[id='__list2-listUl']");
    let benifits = document.querySelector("ul[id='__list3-listUl']");

    if (title != null) {
      jobDetail.title = title.innerHTML;
    }
    if (location != null) {
      location = location.innerHTML;
      jobDetail.city = location.split(',')[0];
      jobDetail.country = location.split(',').slice(1).join(',');
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
      jobDetail.resp = resp.innerText.split('\n');
    }
    if (back != null) {
      jobDetail.back = back.innerText.split('\n');
    }
    if (benifits != null) {
      jobDetail.benifits = benifits.innerText.split('\n');
    }

    return jobDetail;
  })

  return jobJSON;
}

scrape();
