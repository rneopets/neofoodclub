/**
 * Unique per-page-load identifier and dataTransfer MIME type used to tag
 * drag operations, so DropZone can distinguish a drop that originated from
 * this same tab (which should be ignored) from one that came from another
 * tab (which should be imported).
 */
export const TAB_INSTANCE_ID = crypto.randomUUID();
export const BET_DRAG_SOURCE_TYPE = 'application/x-neofoodclub-tab-id';
