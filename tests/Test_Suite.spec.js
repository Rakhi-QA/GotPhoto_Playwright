// @ts-check
import { test } from '@playwright/test';

// Import all individual test specs
import'./api_create_and_upload.spec.js';
//import './open_generated_link.spec.js';
//import './confirm_images_transferred_Input_to_Cam.spec.js';
//import './TraditionalPlus_MoveImages_order.spec.js';

// Optional: wrap them in a describe block for better report grouping
test.describe('GotPhot Complete Test Suite', () => {
  test('Run All Services', async () => {
    console.log('All service test cases imported and will run one by one.');
  });
});
// Auto-update on 2025-10-28 11:20:33Z
// Auto-update on 2025-11-12 10:10:59Z
