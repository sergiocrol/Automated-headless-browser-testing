Number.prototype._called = {};
// Our Page object already requires puppeteer
const Page = require('./helpers/page');

let page;

beforeEach(async () => {
  // So now, we create a page object calling the static function of helpers/page.js, which is a proxy that has
  // access to the methods of original page function coming from puppeteer library, and the methods we have create 
  // in our customPage like login() 
  page = await Page.build();
  // We call the url we want
  await page.goto('http://localhost:3000');
})

afterEach(async () => {
  await page.close();
})

test('The header has the correct text', async () => {
  // We check if in our web we have a header with the name 'Blogster'. Everything coming up from 
  // Puppeteer is ASYNCHRONOUS, so async/await 
  // Here we can take advantage of the created page proxy to declare there a function which implements the weird logic 
  // of puppeteer function [page.$eval(selector, el => el.innerHTML);]
  const text = await page.getContentsOf('a.brand-logo');

  expect(text).toEqual('Blogster');
});

test('clicking login starts oauth flow', async () => {
  await page.click('.right a');
  const url = await page.url();
  expect(url).toMatch(/accounts\.google\.com/);
});

// Test if we can login (if we use test.only, only this test will be executed)
test('when signed in, shows logout button', async () => {
  // login is a method included in our customPage where we put all the logic of the login process so we can reuse many times
  await page.login();
  // $eval is going to pass en element selector as first argument, we will save in text const the result of anything we do
  // in the second argument (in this case take the innerHTML of the element we got from the first argument selector)
  const text = await page.getContentsOf('a[href="/auth/logout"]');

  expect(text).toEqual('Logout');
});
