# Implementation Plan

- [x] 1. Implement CORS proxy configuration and URL construction
  - Create configuration object for translation service settings
  - Implement `getTranslationEndpoint()` function that wraps the translation API URL with CORS proxy
  - Add configuration for CORS proxy URL with default to `https://corsproxy.io/?`
  - _Requirements: 2.1, 5.1, 5.2_

- [ ]* 1.1 Write property test for CORS proxy URL construction
  - **Property 6: CORS proxy URL construction**
  - **Validates: Requirements 2.1**

- [x] 2. Update translateText function to use CORS proxy
  - Modify the existing `translateText()` function to use `getTranslationEndpoint()`
  - Update fetch call to use the proxied URL
  - Ensure request headers and body remain compatible
  - _Requirements: 1.1, 2.1_

- [ ]* 2.1 Write property test for translation request completeness
  - **Property 1: Translation request completeness**
  - **Validates: Requirements 1.1**

- [x] 3. Implement text extraction logic for selection handling
  - Create `getTextToTranslate()` function that checks selection state
  - Return selected text if selection exists (selectionStart !== selectionEnd)
  - Return full text area content if no selection
  - _Requirements: 1.2, 1.3_

- [ ]* 3.1 Write property test for selection-based translation
  - **Property 2: Selection-based translation isolation**
  - **Validates: Requirements 1.2**

- [ ]* 3.2 Write property test for full text translation
  - **Property 3: Full text translation when no selection**
  - **Validates: Requirements 1.3**

- [x] 4. Implement enhanced error handling with classification
  - Add error classification logic (CORS, Network, API errors)
  - Update catch block in `translateText()` to classify errors
  - Display appropriate error messages based on error type
  - Log detailed error information to console
  - _Requirements: 2.3, 2.4_

- [ ]* 4.1 Write property test for error status updates
  - **Property 7: Error status on translation failure**
  - **Validates: Requirements 2.4**

- [x] 5. Implement status indicator updates
  - Ensure status shows "translating..." when translation starts
  - Update status to "idle" on successful completion
  - Update status to "translate failed" on error
  - _Requirements: 1.4, 1.5, 2.4_

- [ ]* 5.1 Write property test for status during translation
  - **Property 4: Status indicator during translation**
  - **Validates: Requirements 1.4**

- [ ]* 5.2 Write property test for status after success
  - **Property 5: Status reset after successful translation**
  - **Validates: Requirements 1.5**

- [x] 6. Implement translation result application logic
  - Create `applyTranslation()` function that handles replace vs append modes
  - For replace mode with selection: replace only selected portion
  - For replace mode without selection: replace entire text
  - For append mode: add translated text after original with separator
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 6.1 Write property test for replace mode
  - **Property 8: Replace mode text substitution**
  - **Validates: Requirements 3.1**

- [ ]* 6.2 Write property test for append mode
  - **Property 9: Append mode text preservation**
  - **Validates: Requirements 3.2**

- [ ]* 6.3 Write property test for partial replacement
  - **Property 10: Partial replacement with selection**
  - **Validates: Requirements 3.3**

- [x] 7. Implement language preference persistence
  - Ensure target language selection is saved to localStorage on change
  - Restore saved language preference on page load
  - Set default language if no preference exists
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 7.1 Write property test for preference persistence
  - **Property 11: Language preference persistence**
  - **Validates: Requirements 4.1, 4.2**

- [x] 8. Implement custom endpoint configuration support
  - Add support for reading custom translation endpoint from configuration
  - Allow override of default LibreTranslate endpoint
  - Document configuration format in code comments
  - _Requirements: 5.1, 5.2_

- [ ]* 8.1 Write property test for custom endpoint override
  - **Property 12: Custom endpoint override**
  - **Validates: Requirements 5.2**

- [x] 9. Update translate button event handler
  - Integrate `getTextToTranslate()` for proper text extraction
  - Integrate `applyTranslation()` for result handling
  - Ensure button is disabled during translation
  - Re-enable button after completion or error
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
