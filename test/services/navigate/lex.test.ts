/*
 * Copyright (c) 2018-2019 FinancialForce.com, inc. All rights reserved.
 */

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Browser, launch, Page } from 'puppeteer';
import { SinonStub, stub, restore } from 'sinon';
import sinonChai from 'sinon-chai';
import { navigate } from '../../../src/services/navigate/lex';

const SELECTORS = Object.freeze({
	APP_LAUNCHER_BUTTON: '.appLauncher > one-app-launcher-header',
	APP_LAUNCHER_ALL_TABS_BUTTON: 'one-app-launcher-menu > div > lightning-button[class*="button"]',
	ALL_TABS_TAB_FOR_NAME_WITH_ATTRIBUTE: 'one-app-launcher-tab-item a[data-label="Example Tab"][href*="ExamplePage"]',
	ALL_TABS_TAB_FOR_NAME_WITHOUT_ATTRIBUTE: 'one-app-launcher-tab-item a[data-label="Example Tab"]',
	VF_FRAME: 'iframe[name*="vfFrameId"]',
	VF_FRAME_WITH_TITLE: 'iframe[name*="vfFrameId"][title*="123"]',
});

const { goToFrontdoor, getVfFrame, goToAllTabsTab, homeIsLoaded } = navigate;

chai.use(chaiAsPromised);
chai.use(sinonChai);

interface StubElementHandle {
	click: SinonStub;
}

function stubFindElement(page: Page, findFunctionName: keyof Page, error?: Error, ...args: any[]): StubElementHandle {
	const result = {
		click: stub().resolves()
	};

	const findElementStub = (page[findFunctionName] as SinonStub).withArgs(...args);
	if (error)
		findElementStub.rejects(error);
	else
		findElementStub.resolves(result);

	return result;
}

describe('../../../src/services/navigate/lex', async () => {
	let browser: Browser;
	let page: Page;

	before(async function() {
		// The first time you start chromium can take some time
		this.timeout(60000);

		// Check if running in container, different config is required if so 
		if (process.env.PUPPETEER_DOCKER_CONTAINER) {
			browser = await launch({
				executablePath: '/usr/bin/google-chrome',
				args: ['--no-sandbox']
			});
		} else {
			browser = await launch();
		}
		page = await browser.newPage();
	});

	after(async () => {
		browser.close();
	});

	beforeEach(async () => {
		// Reject any unexpected waitForSelector/XPath calls, so each test
		// has to explicitly declare which elements it expects
		stub(page, 'waitForSelector').rejects(new Error('selector Bad'));

		// Just resolve any navigation events, each test will check
		// the positive and negative case.
		stub(page, 'waitForNavigation').resolves();
	});

	afterEach(() => {
		restore();
	});

	describe('goToFrontdoor', () => {
		it('should return the reponse for the navigation', async () => {
				stub(page, 'goto').resolves({
					ok : () => true,
				});
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
			tabElement = stubFindElement(page, 'waitForSelector', undefined, SELECTORS.APP_LAUNCHER_BUTTON);
			tabElement = stubFindElement(page, 'waitForSelector', undefined, SELECTORS.APP_LAUNCHER_ALL_TABS_BUTTON);
		});

		it('should return the tab element with no tabAttribute without clicking', async () => {
			// Given
			tabElement = stubFindElement(page, 'waitForSelector', undefined, SELECTORS.ALL_TABS_TAB_FOR_NAME_WITHOUT_ATTRIBUTE);
			const navigateConfig = { doNavigate: false, page };

			// When
			const element = await goToAllTabsTab(navigateConfig, 'Example Tab');

			// Then
			expect(element).to.eql(tabElement);

			expect(tabElement.click).to.not.have.been.called;
			expect(page.waitForNavigation).to.not.have.been.called;
		});

		it('should return the tab element with tabAttribute without clicking', async () => {
			// Given
			tabElement = stubFindElement(page, 'waitForSelector', undefined, SELECTORS.ALL_TABS_TAB_FOR_NAME_WITH_ATTRIBUTE);
			const navigateConfig = { doNavigate: false, page };

			// When
			const element = await goToAllTabsTab(navigateConfig, 'Example Tab', '[href*="ExamplePage"]');

			// Then
			expect(element).to.eql(tabElement);

			expect(tabElement.click).to.not.have.been.called;
			expect(page.waitForNavigation).to.not.have.been.called;
		});

		it('should return the empty when tabAttribute is not defined', async () => {
			// Given
			tabElement = stubFindElement(page, 'waitForSelector', undefined, SELECTORS.ALL_TABS_TAB_FOR_NAME_WITHOUT_ATTRIBUTE);
			const navigateConfig = { doNavigate: false, page };

			// When
			const element = await goToAllTabsTab(navigateConfig, 'Example Tab');

			// Then
			expect(element).to.eql(tabElement);

			expect(tabElement.click).to.not.have.been.called;
			expect(page.waitForNavigation).to.not.have.been.called;
		});

	});

	describe('getVfFrame', () => {

		beforeEach(() => {
			stubFindElement(page, 'waitForSelector', undefined, SELECTORS.VF_FRAME);
			stubFindElement(page, 'waitForSelector', undefined, SELECTORS.VF_FRAME_WITH_TITLE);
		});

		it('should reject if find vfFrame rejects', async () => {
			// Given
			const navigateConfig = { page };
			stubFindElement(page, 'waitForSelector', new Error('Bad vfFrame'), SELECTORS.VF_FRAME);

			// When
			await expect(getVfFrame(navigateConfig))

			// Then
				.to.be.rejectedWith('Bad vfFrame');
		});

		it('should return the vfFrame element with domain', async () => {
			// Given
			function makeFrames(...frameNames: string[]) {
				return frameNames.map(x => ({
					name: () => x,
					url: () => x
				}));
			}
			const frames = makeFrames('main', 'vfFrameId_123', 'someOtherFrame');

			const navigateConfig = { page, pageDomain: 'vfFrameId_123' };
			stub(page, 'frames').returns(frames);

			// When
			const vfFrame = await getVfFrame(navigateConfig);

			// Then
			expect(vfFrame).to.eql(frames[1]);
		});

		it('should return the vfFrame element without domain', async () => {
			// Given
			function makeFrames(...frameNames: string[]) {
				return frameNames.map(x => ({
					name: () => x,
					url: () => x
				}));
			}
			const frames = makeFrames('main', 'vfFrameId_123', 'someOtherFrame');

			const navigateConfig = { page };
			stub(page, 'frames').returns(frames);

			// When
			const vfFrame = await getVfFrame(navigateConfig);

			// Then
			expect(vfFrame).to.eql(frames[1]);
		});

		it('should return the vfFrame element with title in it', async () => {
			// Given
			function makeFrames(...frameNames: string[]) {
				return frameNames.map(x => ({
					name: () => x,
					url: () => x,
					title: async () => x
				}));
			}
			const frames = makeFrames('main', 'vfFrameId_123', 'someOtherFrame');

			const navigateConfig = { page, title: '123' };
			stub(page, 'frames').returns(frames);

			// When
			const vfFrame = await getVfFrame(navigateConfig);

			// Then
			expect(vfFrame).to.eql(frames[1]);
		});
	});

	describe('homeIsLoaded', () => {
		it('should return the vfFrame element', async () => {
			const homeElement = stubFindElement(page, 'waitForSelector', undefined, SELECTORS.APP_LAUNCHER_BUTTON);

			// Given
			const navigateConfig = { page };

			// When
			const element = await homeIsLoaded(navigateConfig);

			// Then
			expect(element).to.eql(homeElement);
		});
	});
});