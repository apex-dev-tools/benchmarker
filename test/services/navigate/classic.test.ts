/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Browser, Frame, HTTPResponse, launch, Page } from 'puppeteer';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import { navigate } from '../../../src/services/navigate/classic';

const SELECTORS = Object.freeze({
  ALL_TABS: 'a[href*="showAllTabs"]',
  ALL_TABS_TAB_NO_NAME: 'xpath///a[contains(@class, "listRelatedObject")]',
  ALL_TABS_TAB_FOR_NAME:
    'xpath///a[contains(@class, "listRelatedObject") and text()="Example Tab"]',
  HOME_INDICATOR: 'div[title="App Menu"]',
});

const { goToFrontdoor, getVfFrame, goToAllTabsTab, homeIsLoaded } = navigate;

chai.use(chaiAsPromised);
chai.use(sinonChai);

interface StubElementHandle {
  click: SinonStub;
}

function stubFindElement(
  page: Page,
  findFunctionName: keyof Page,
  error?: Error,
  ...args: any[]
): StubElementHandle {
  const result = {
    click: sinon.stub().resolves(),
  };

  const findElementStub = (page[findFunctionName] as SinonStub).withArgs(
    ...args
  );
  if (error) findElementStub.rejects(error);
  else findElementStub.resolves(result);

  return result;
}

describe('src/services/navigate/classic', async () => {
  let browser: Browser;
  let page: Page;

  before(async function () {
    // The first time you start chromium can take some time
    this.timeout(60000);

    // Check if running in container, different config is required if so
    if (process.env.PUPPETEER_DOCKER_CONTAINER) {
      browser = await launch({
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox'],
      });
    } else {
      browser = await launch();
    }
    page = await browser.newPage();
  });

  after(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    // Reject any unexpected waitForSelector/XPath calls, so each test
    // has to explicitly declare which elements it expects
    sinon.stub(page, 'waitForSelector').rejects(new Error('Bad'));

    // Just resolve any navigation events, each test will check
    // the positive and negative case.
    sinon.stub(page, 'waitForNavigation').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('goToFrontdoor', () => {
    it('should return the reponse for the navigation', async () => {
      sinon.stub(page, 'goto').resolves({
        ok: () => true,
      } as HTTPResponse);
      // Given
      const navigateConfig = { page };

      // When
      const reponse = await goToFrontdoor(navigateConfig, 'exampleUrl');

      // Then
      expect(reponse!.ok()).to.eql(true);
    });
  });

  describe('goToAllTabsTab', () => {
    let tabElement: StubElementHandle;

    beforeEach(() => {
      tabElement = stubFindElement(
        page,
        'waitForSelector',
        undefined,
        SELECTORS.ALL_TABS_TAB_FOR_NAME
      );
    });

    describe('when doNavigate is undefined', () => {
      it('should return the tab element and click some elements', async () => {
        // Given
        const navigateConfig = { page };

        // When
        const element = await goToAllTabsTab(navigateConfig, 'Example Tab');

        // Then
        expect(element).to.eql(tabElement);

        expect(tabElement.click).to.have.been.calledOnce;
        expect(page.waitForNavigation).to.have.been.calledOnce;
      });
    });

    describe('when doNavigate is false', () => {
      it('should reject if find tab rejects', async () => {
        // Given
        const navigateConfig = { doNavigate: false, page };
        tabElement = stubFindElement(
          page,
          'waitForSelector',
          new Error('Bad allTabs'),
          SELECTORS.ALL_TABS_TAB_FOR_NAME
        );

        // When
        await expect(goToAllTabsTab(navigateConfig, 'Example Tab'))
          // Then
          .to.be.rejectedWith('Bad allTabs');

        expect(tabElement.click).to.not.have.been.called;
        expect(page.waitForNavigation).to.not.have.been.called;
      });

      it('should return the tab element without clicking', async () => {
        // Given
        const navigateConfig = { doNavigate: false, page };

        // When
        const element = await goToAllTabsTab(navigateConfig, 'Example Tab');

        // Then
        expect(element).to.eql(tabElement);

        expect(tabElement.click).to.not.have.been.called;
        expect(page.waitForNavigation).to.not.have.been.called;
      });

      it('should reject if no tab name is passed', async () => {
        // Given
        const navigateConfig = { doNavigate: false, page };
        tabElement = stubFindElement(
          page,
          'waitForSelector',
          new Error('Bad selector'),
          SELECTORS.ALL_TABS_TAB_NO_NAME
        );

        // When
        await expect(goToAllTabsTab(navigateConfig))
          // Then
          .to.be.rejectedWith('Bad selector');

        expect(tabElement.click).to.not.have.been.called;
        expect(page.waitForNavigation).to.not.have.been.called;
      });
    });

    describe('when doNavigate is true', () => {
      it('should reject if find tab rejects', async () => {
        // Given
        const navigateConfig = { doNavigate: true, page };
        tabElement = stubFindElement(
          page,
          'waitForSelector',
          new Error('Bad allTabs'),
          SELECTORS.ALL_TABS_TAB_FOR_NAME
        );

        // When
        await expect(goToAllTabsTab(navigateConfig, 'Example Tab'))
          // Then
          .to.be.rejectedWith('Bad allTabs');

        expect(tabElement.click).to.not.have.been.called;
        expect(page.waitForNavigation).to.not.have.been.called;
      });

      it('should error if waitForSelector resolves null', async () => {
        // Given
        (page.waitForSelector as SinonStub).resolves(null);
        const navigateConfig = { doNavigate: true, page };

        // When
        await expect(goToAllTabsTab(navigateConfig, 'Example Tab Null'))
          // Then
          .to.be.rejectedWith('All tab not found.');

        expect(page.waitForNavigation).to.not.have.been.called;
        expect(tabElement.click).to.not.have.been.called;
      });

      it('should return the tab element and click some elements', async () => {
        // Given
        const navigateConfig = { doNavigate: true, page };

        // When
        const element = await goToAllTabsTab(navigateConfig, 'Example Tab');

        // Then
        expect(element).to.eql(tabElement);

        expect(tabElement.click).to.have.been.calledOnce;
        expect(page.waitForNavigation).to.have.been.calledOnce;
      });
    });
  });

  describe('getVfFrame', () => {
    it('should return the vfFrame element', async () => {
      // Given
      const frame = { name: 'Main' };
      const navigateConfig = { page };
      sinon.stub(page, 'mainFrame').returns(frame as unknown as Frame);

      // When
      const mainFrame = await getVfFrame(navigateConfig);

      // Then
      expect(mainFrame).to.eql(frame);
    });
  });

  describe('homeIsLoaded', () => {
    it('should return an identifiable element after home is loaded', async () => {
      const homeElement = stubFindElement(
        page,
        'waitForSelector',
        undefined,
        SELECTORS.HOME_INDICATOR
      );

      // Given
      const navigateConfig = { page };

      // When
      const element = await homeIsLoaded(navigateConfig);

      // Then
      expect(element).to.eql(homeElement);
    });
  });
});
