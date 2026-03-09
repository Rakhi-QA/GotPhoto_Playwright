// @ts-check
import { test } from '@playwright/test';

/**
 * ============================================================
 * GotPhoto Automation - Master Test Suite
 * ------------------------------------------------------------
 * This suite imports all service test specifications to ensure
 * they are executed as part of the complete workflow.
 *
 * Execution Order (recommended via file naming):
 * 01 - Full Composite
 * 02 - Full Composite (Ignore Team Image)
 * 03 - Full Composite (Move Team Image)
 * 04 - Traditional Plus (Move Images Order)
 * 05 - Traditional (Ignore Team)
 * 06 - Traditional (Move Team Image)
 * 07 - Traditional Plus (Ignore Image)
 * 08 - Traditional Plus (Move Team Image)
 *
 * Note:
 * Ensure `workers: 1` and `fullyParallel: false` in
 * playwright.config.js for sequential execution.
 * ============================================================
 */

// Import all individual test specs
import './Fullcomposite.spec.js';
import './FullCompNoTeamIgnoreTeamImage.spec.js';
import './FullCompNoTeamMoveTeamImg.spec.js';
//import './TraditionalPlus_MoveImages_order.spec.js';
import './TraditionalIgnoreTeam.spec.js';
import './TraditionalMoveTeamImage.spec.js';
import './TraditionalPlus_IgnoreImage.spec.js';
import './TraditionalPlus_MoveTeamImage.spec.js';

test.describe.serial('GotPhoto Complete Service Test Suite', () => {

  test('Initialize GotPhoto Test Suite', async () => {
    console.log('Starting execution of all GotPhoto service test cases in sequence...');
  });

});