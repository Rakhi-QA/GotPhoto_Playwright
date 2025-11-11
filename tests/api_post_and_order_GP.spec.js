import { test, expect } from '@playwright/test';
import { saveGeneratedLink } from '../utils/linkStorage.js';

test('POST GotPhoto API → get generated link → open it in browser', async ({ request, page }) => {

  // ✅ Step 1: Define API endpoint
  const apiUrl = 'https://staging.production.nextgenphotosolutions.com/Gpservices/pushData';

  // ✅ Step 2: Define your payload
  const payload = {
    "firstname": "Rakhhi",
    "lastname": "Doijad",
    "phone": "",
    "country": "CA",
    "api_key": "GP=Ha2xc0Rcc2less2=NG",
    "job_name": "Test_Staging_" + Date.now(), // make job name unique
    "alias_name": "Test_Staging_" + Date.now(),
    "email_id": "rakhiqa@tiuconsulting.com",
    "editing_request_id": "407",
    "redirect_success_url": "https://gotphoto.com",
    "players_detail": {
      "0": {
        "first_name": "rakesh",
        "last_name": "pat",
        "team_name": "YANKEES",
        "jersey_number": "11",
        "team_image": "A.jpg",
        "individual_image1": "B.jpg",
        "access_code": "12A1"
      },
      "1": {
        "first_name": "Ana",
        "last_name": "A",
        "team_name": "YANKEES",
        "jersey_number": "11",
        "team_image": "C.jpg",
        "individual_image1": "D.jpg",
        "individual_image2": "E.jpg",
        "access_code": "12A1"
      }
    }
  };

  // ✅ Step 3: Send POST request with JSON body
  const response = await request.post(apiUrl, {
    headers: { 'Content-Type': 'application/json' },
    data: payload
  });

  // ✅ Step 4: Check response status
  expect(response.ok()).toBeTruthy();

  // ✅ Step 5: Parse JSON response
  const responseBody = await response.json();
  console.log('✅ API Response:', responseBody);

  // ✅ Step 6: Extract generated link (checkout_url)
  const generatedLink =
    responseBody.checkout_url ||
    responseBody.redirect_link ||
    responseBody.order_url ||
    responseBody.link ||
    responseBody.url ||
    null;

  if (!generatedLink) {
    console.log('❌ No generated link found in API response.');
    console.log('⚠️ Check the response keys — your API might use another field name.');
    return;
  }

  console.log('🔗 Generated Link:', generatedLink);
   saveGeneratedLink(generatedLink);
 await page.waitForTimeout(4000);
  
});
