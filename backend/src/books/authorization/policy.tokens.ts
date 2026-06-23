// Tokens for the policies that protect the books feature. Each CAN_* token
// is bound to a concrete policy implementation in books.module.ts.
//
// Other features do not need to know about these tokens; the policies guard
// framework resolves them generically via @Policies(CAN_EDIT_BOOK) etc.
export const CAN_EDIT_BOOK = 'CAN_EDIT_BOOK';
export const CAN_DELETE_BOOK = 'CAN_DELETE_BOOK';
export const CAN_DELETE_COMMENT = 'CAN_DELETE_COMMENT';
