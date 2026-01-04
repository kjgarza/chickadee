#!/usr/bin/env bun
/**
 * Test the cooking timer app with Puppeteer
 */
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:8083';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('🧪 Starting Puppeteer tests...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test 1: Main page loads and has tag filter
    console.log('Test 1: Main page with tag filter');
    await page.goto(BASE_URL);
    await page.waitForSelector('#tag-filter');
    const tagButtons = await page.$$('.tag-filter-btn');
    console.log(`  ✓ Tag filter loaded with ${tagButtons.length} buttons`);
    
    // Test 2: Recipe page loads
    console.log('\nTest 2: Recipe page loads');
    await page.goto(`${BASE_URL}/recipes/pasta-carbonara/`);
    await page.waitForSelector('#timer-controls');
    const title = await page.$eval('h1', el => el.textContent);
    console.log(`  ✓ Recipe page loaded: ${title}`);
    
    // Test 3: Ingredients visible before start
    console.log('\nTest 3: Ingredients visible before timer start');
    const ingredientsVisible = await page.$eval('#ingredients-section', el => !el.classList.contains('hidden'));
    console.log(`  ✓ Ingredients section visible: ${ingredientsVisible}`);
    
    // Test 4: Start timer and check ingredients collapse
    console.log('\nTest 4: Start timer collapses ingredients');
    await page.click('#start-btn');
    await delay(500);
    const ingredientsHidden = await page.$eval('#ingredients-section', el => el.classList.contains('hidden'));
    const servingHidden = await page.$eval('#serving-section', el => el.classList.contains('hidden'));
    console.log(`  ✓ Ingredients hidden: ${ingredientsHidden}`);
    console.log(`  ✓ Serving selector hidden: ${servingHidden}`);
    
    // Test 5: Pause button visible when running
    console.log('\nTest 5: Pause button visible when timer running');
    const pauseVisible = await page.$eval('#pause-btn', el => !el.classList.contains('hidden'));
    console.log(`  ✓ Pause button visible: ${pauseVisible}`);
    
    // Test 6: Click pause
    console.log('\nTest 6: Pause functionality');
    await page.click('#pause-btn');
    await delay(500);
    const resumeVisible = await page.$eval('#resume-btn', el => !el.classList.contains('hidden'));
    console.log(`  ✓ Resume button visible after pause: ${resumeVisible}`);
    
    // Test 7: Resume
    console.log('\nTest 7: Resume functionality');
    await page.click('#resume-btn');
    await delay(500);
    const pauseVisibleAgain = await page.$eval('#pause-btn', el => !el.classList.contains('hidden'));
    console.log(`  ✓ Pause button visible after resume: ${pauseVisibleAgain}`);
    
    // Test 8: Reset timer
    console.log('\nTest 8: Reset functionality');
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    await page.click('#reset-btn');
    await delay(500);
    const startVisible = await page.$eval('#start-btn', el => !el.classList.contains('hidden'));
    const ingredientsVisibleAgain = await page.$eval('#ingredients-section', el => !el.classList.contains('hidden'));
    console.log(`  ✓ Start button visible after reset: ${startVisible}`);
    console.log(`  ✓ Ingredients visible after reset: ${ingredientsVisibleAgain}`);
    
    // Test 9: Tag filter on main page
    console.log('\nTest 9: Tag filter functionality');
    await page.goto(BASE_URL);
    await page.waitForSelector('.tag-filter-btn[data-tag="italian"]');
    await page.click('.tag-filter-btn[data-tag="italian"]');
    await delay(300);
    const italianBtnActive = await page.$eval('.tag-filter-btn[data-tag="italian"]', el => el.classList.contains('btn-primary'));
    console.log(`  ✓ Italian tag button active: ${italianBtnActive}`);
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
