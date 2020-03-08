const sessionFactory = require('../factories/sessionFactory');
const userFactory = require('../factories/userFactory');
const puppeteer = require('puppeteer');

/*
  We will setup an interface with a proxy, which allows us to access to the original page() function from the puppeteer library,
  and also to a customized function (CustomPage()) that we'll create in order to add new functionality.
  Actually this can we made by different approachs.
    1) We could override the original page() function -> page.prototype.login = async () => {...}
    2) We could extends the new CustomPage with Page, and add/modify the methods -> class CustomPage extends Page { ... }
    3) If we cannot extends (with Puppeteer is complex), we can make some wrapping -> 
      class CustomPage {
        constructor(page) {
          this.page = page;
        }
        login() {
          this.page.goto(...)
        }
      }
      But this approach means that we have to create an instance from CustomPage, and everytime we want to call a
      method from original page() function, we need to write -> customPage.page.goto(...).
    
    The proxy allows us to manage access to target object or multiple target object. So we can have the original page()
    function, but also a CustomPage() function and call to the diffetent methods just with their names.
*/
class CustomPage {
  // this static function here will create a new puppeteer page. It's static, so we don't need to creatre an instance from 
  // CustomPage in order to call it
  static async build() {
    // We create a browser object and a page object
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    // We create an instance of CustomPage. We pass page object as argument, which contains all the methos of original page() function
    const customPage = new CustomPage(page);

    // We create a Proxy function, and we pass to it two arguments, the instance of our CustomPage, and a handler object
    // which will have GET property. This prop defines a function with another two args -> target(= customPage) and property
    // which is the name of the method we want to execute and which will be called later on.
    return new Proxy(customPage, {
      get: function (target, property) {
        // We can look for the method if different objects. So in this case we look for inside customPage, and if it is not 
        // there, we look for inside page object, and finally inside browser object if there is not inside the other two.
        return target[property] || browser[property] || page[property];
      }
    });
  }

  constructor(page) {
    this.page = page;
  }

  async login() {
    // userFactory is returning a promise, so we need to use async/await
    const user = await userFactory();
    const { session, sig } = sessionFactory(user);

    // We set the cookie and cookie.sig and reload the page
    await this.page.setCookie({ name: 'session', value: session });
    await this.page.setCookie({ name: 'session.sig', value: sig });
    await this.page.goto('http://localhost:3000/blogs');

    // When we load the this.page and right after we run another function, might happen that the this.page is not loaded yet
    // when is trying to catch <a> element. To solve that we have this.page.waitFor function in Puppeteer, that allows us 
    // to pass an element. ppt is going to wait until get that element to continue the execution
    await this.page.waitFor('a[href="/auth/logout"]');
  }

  async getContentsOf(selector) {
    // Here 'el -> el.innerHTML' is being converted into text by Puppeteer, and sent to the Chronium instance
    // (since the chronium instance is not being running inside NodeJS, but completely separate). Chronium run the function
    // and the response get back to Puppeteer, who will evaluate the response.
    return this.page.$eval(selector, el => el.innerHTML);
  }

  // In blog.test.js we have described those tests when the user is not logged in, making API requests.
  // In this case we have used only two routes (GET and POST of /api/blogs), but in a professional app, we could've many of
  // them. So a way to refactor is this:
  get(path) {
    // When we use page.evaluate() function of puppeteer, the inside function will be converted to String and passed to a Chronium
    // instance, where will be turned on to function again. The problem is that in that way, we loose the 'path' argument scope that
    // we pass in get function.
    // To solve that, we can pass it as a second argument of the function page.evaluate() -> $$, and once in chronium that will be 
    // passed to the function (Is that because we are referencing to path like _path, because this will be the argument passed once in Chronium)
    return this.page.evaluate((_path) => {
      return fetch(_path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(res => res.json());
    }, path /* $$ */);
  }

  post(path, data) {
    return this.page.evaluate((_path, _data) => {
      return fetch(_path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(_data)
      }).then(res => res.json());
    }, path, data);
  }

  execRequests(actions) {
    // combine all promises and convert it in one only promise. When that promise is ready, it will be returned
    return Promise.all(
      actions.map(({ method, path, data }) => {
        return this[method](path, data);
      })
    );
  }
}

module.exports = CustomPage;
