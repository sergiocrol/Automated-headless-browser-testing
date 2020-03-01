Number.prototype._called = {};
const Page = require('./helpers/page');

let page;

beforeEach(async () => {
  page = await Page.build();
  await page.goto('localhost:3000');
})

afterEach(async () => {
  await page.close();
})


// We can use describe function in order to make conditional assertions
describe('When logged in', async () => {
  // this beforeEach will be only executed before the tests written INSIDE this describe object
  beforeEach(async () => {
    await page.login();
    await page.click('a.btn-floating');
  });

  test('Can see blog create form', async () => {
    const label = await page.getContentsOf('form label');

    expect(label).toEqual('Blog Title');
  });

  // Another describe function nested to the first one
  // The idea is to read all the nested sentences and it makes sense -> When logged in, and using
  // invalid inputs, the form shows an error message
  describe('And using invalid inputs', async () => {
    // The first beforeEach apply to every test, so here we specify another beforeEach where I enter empty
    // fields, which means that are invalid
    beforeEach(async () => {
      // we click in NEXT button of the form
      await page.click('form button');
    });

    // We check in after click the NEXT button without content in the inputs, we can see the error messages
    test('the form shows an error message', async () => {
      const titleError = await page.getContentsOf('.title .red-text');
      const contentError = await page.getContentsOf('.content .red-text');

      expect(titleError).toEqual('You must provide a value');
      expect(contentError).toEqual('You must provide a value');
    })
  });

  describe('And using valid inputs', async () => {
    beforeEach(async () => {
      await page.type('.title input', 'My title');
      await page.type('.content input', 'My content');
      await page.click('form button');
    });

    test('Submitting takes user to review screen', async () => {
      const text = await page.getContentsOf('h5');

      expect(text).toEqual('Please confirm your entries');
    });

    test('submitting then saving adds blog to index page', async () => {
      // After clicking in the confirmation button, we save the post, but it takes some amount of time to complete
      // the process, so we'll wait until the card (the card we've just created with 'My title/My content') appears to continue
      await page.click('button.green');
      await page.waitFor('.card');

      const title = await page.getContentsOf('.card-title');
      const content = await page.getContentsOf('p');

      expect(title).toEqual('My title');
      expect(content).toEqual('My content');
    });
  });

});

describe('User is not logged in', async () => {
  // the best way to make reusable the different requests is to summarize the actions, so we create un array with a 
  // different object for every method (get, post, patch, delete...) and the vars we need, and then we make one unique test
  // which will call the execRequests() function from page.js (which at the same time will call map the array an call the 
  // appropriate function every time)
  const actions = [
    {
      method: 'get',
      path: '/api/blogs',
    },
    {
      method: 'post',
      path: '/api/blogs',
      data: {
        title: 'My title',
        content: 'My content'
      }
    }
  ];

  test('Blog related actions are prohibited', async () => {
    const results = await page.execRequests(actions);

    for (let result of results) {
      expect(result).toEqual({ error: 'You must log in!' });
    }
  });
});