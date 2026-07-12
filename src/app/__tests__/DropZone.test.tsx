import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { render, screen, createMockDragEvent } from '../../test/utils';
import { BET_DRAG_SOURCE_TYPE, TAB_INSTANCE_ID } from '../dragSource';
import DropZone from '../DropZone';
import { useAddNewSet, useSetViewMode, useViewMode } from '../stores';
import { anyBetsExist, parseBetUrl } from '../util';

// Mock the dependencies
vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react');
  return {
    ...actual,
    useToast: vi.fn(),
  };
});

vi.mock('../stores', () => ({
  useAddNewSet: vi.fn(),
  useViewMode: vi.fn(),
  useSetViewMode: vi.fn(),
}));

vi.mock('../util', () => ({
  anyBetsExist: vi.fn(),
  parseBetUrl: vi.fn(),
}));

describe('DropZone', () => {
  const mockAddNewSet = vi.fn();
  const mockSetViewMode = vi.fn();
  const mockAnyBetsExist = vi.mocked(anyBetsExist);
  const mockParseBetUrl = vi.mocked(parseBetUrl);
  const mockUseViewMode = vi.mocked(useViewMode);

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    (useAddNewSet as unknown as { mockReturnValue: (value: unknown) => void }).mockReturnValue(
      mockAddNewSet,
    );
    (useSetViewMode as unknown as { mockReturnValue: (value: unknown) => void }).mockReturnValue(
      mockSetViewMode,
    );
    mockUseViewMode.mockReturnValue(true);

    // Setup default mock returns
    mockAnyBetsExist.mockReturnValue(true);
    mockParseBetUrl.mockReturnValue({
      round: 1234,
      bets: new Map([[1, [1, 2, 3, 4, 5]]]),
      betAmounts: new Map([[1, 1000]]),
    });
  });

  afterEach(() => {
    // Clean up event listeners that might have been added
    const events = ['drop', 'dragover'];
    events.forEach(eventType => {
      document.removeEventListener(eventType, vi.fn() as unknown as EventListener);
    });
  });

  it('renders children correctly', () => {
    render(
      <DropZone>
        <div data-testid="child-element">Test Child</div>
      </DropZone>,
    );

    expect(screen.getByTestId('child-element')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('adds event listeners for drop and dragover on mount', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('prevents default behavior on dragover', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dragOverEvent = createMockDragEvent('dragover');
    const preventDefaultSpy = vi.spyOn(dragOverEvent, 'preventDefault');

    document.dispatchEvent(dragOverEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('handles successful bet drop with URL', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123',
      'text/html': '<a href="https://example.com/#round=1234&b=123">My Bet Set</a>',
    });
    const preventDefaultSpy = vi.spyOn(dropEvent, 'preventDefault');

    document.dispatchEvent(dropEvent);

    expect(mockParseBetUrl).toHaveBeenCalledWith('round=1234&b=123');
    expect(mockAnyBetsExist).toHaveBeenCalledWith(new Map([[1, [1, 2, 3, 4, 5]]]));
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(mockAddNewSet).toHaveBeenCalledWith(
      'My Bet Set',
      new Map([[1, [1, 2, 3, 4, 5]]]),
      new Map([[1, 1000]]),
      true,
    );
  });

  it('generates default name when dropped content starts with http', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123',
      'text/html': 'https://example.com/#round=1234&b=123',
    });

    document.dispatchEvent(dropEvent);

    expect(mockAddNewSet).toHaveBeenCalledWith(
      'Dropped Set [Round 1234]',
      new Map([[1, [1, 2, 3, 4, 5]]]),
      new Map([[1, 1000]]),
      true,
    );
  });

  it('removes HTML tags from dropped content name', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123',
      'text/html': '<div><strong>Complex</strong> <em>HTML</em> Name</div>',
    });

    document.dispatchEvent(dropEvent);

    expect(mockAddNewSet).toHaveBeenCalledWith(
      'Complex HTML Name',
      new Map([[1, [1, 2, 3, 4, 5]]]),
      new Map([[1, 1000]]),
      true,
    );
  });

  it('does nothing when dataTransfer is null', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = new Event('drop') as DragEvent;
    // dataTransfer is null by default

    document.dispatchEvent(dropEvent);

    expect(mockParseBetUrl).not.toHaveBeenCalled();
    expect(mockAddNewSet).not.toHaveBeenCalled();
  });

  it('does nothing when no URL is provided', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/html': 'Some content without URL',
    });

    document.dispatchEvent(dropEvent);

    expect(mockParseBetUrl).not.toHaveBeenCalled();
    expect(mockAddNewSet).not.toHaveBeenCalled();
  });

  it('falls back to text/plain when text/uri-list is not available', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/plain': 'https://example.com/#round=1234&b=123',
      'text/html': '<a href="https://example.com/#round=1234&b=123">My Bet Set</a>',
    });

    document.dispatchEvent(dropEvent);

    expect(mockParseBetUrl).toHaveBeenCalledWith('round=1234&b=123');
    expect(mockAddNewSet).toHaveBeenCalledWith(
      'My Bet Set',
      new Map([[1, [1, 2, 3, 4, 5]]]),
      new Map([[1, 1000]]),
      true,
    );
  });

  it('does nothing when URL has no hash', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/page',
    });

    document.dispatchEvent(dropEvent);

    expect(mockParseBetUrl).not.toHaveBeenCalled();
    expect(mockAddNewSet).not.toHaveBeenCalled();
  });

  it('does nothing when parsed bets do not exist', () => {
    mockAnyBetsExist.mockReturnValue(false);

    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123',
    });

    document.dispatchEvent(dropEvent);

    expect(mockParseBetUrl).toHaveBeenCalledWith('round=1234&b=123');
    expect(mockAnyBetsExist).toHaveBeenCalled();
    expect(mockAddNewSet).not.toHaveBeenCalled();
  });

  it('handles edge case with empty HTML content', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123',
      'text/html': '',
    });

    document.dispatchEvent(dropEvent);

    // Empty HTML content falls back to URL, which starts with 'http', so generates default name
    expect(mockAddNewSet).toHaveBeenCalledWith(
      'Dropped Set [Round 1234]',
      new Map([[1, [1, 2, 3, 4, 5]]]),
      new Map([[1, 1000]]),
      true,
    );
  });

  it('handles multiple URLs in uri-list (takes first one)', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123\nhttps://other.com/#round=5678&b=456',
      'text/html': 'First Link',
    });

    document.dispatchEvent(dropEvent);

    // The implementation processes each URL separately
    // Multiple URLs are separated by newlines in text/uri-list
    expect(mockParseBetUrl).toHaveBeenCalledTimes(2);
    expect(mockParseBetUrl).toHaveBeenNthCalledWith(1, 'round=1234&b=123');
    expect(mockParseBetUrl).toHaveBeenNthCalledWith(2, 'round=5678&b=456');

    // Each URL gets numbered since there are multiple
    expect(mockAddNewSet).toHaveBeenCalledTimes(2);
    expect(mockAddNewSet).toHaveBeenNthCalledWith(
      1,
      'Dropped Set 1 [Round 1234]',
      new Map([[1, [1, 2, 3, 4, 5]]]),
      new Map([[1, 1000]]),
      true,
    );
    expect(mockAddNewSet).toHaveBeenNthCalledWith(
      2,
      'Dropped Set 2 [Round 1234]',
      new Map([[1, [1, 2, 3, 4, 5]]]),
      new Map([[1, 1000]]),
      true,
    );
  });

  it('does nothing when URL without hash is provided', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/no-hash',
    });

    document.dispatchEvent(dropEvent);

    expect(mockParseBetUrl).not.toHaveBeenCalled();
    expect(mockAddNewSet).not.toHaveBeenCalled();
  });

  it('ignores drops that originated from the same tab', () => {
    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://neofood.club/#round=1234&b=abc',
      [BET_DRAG_SOURCE_TYPE]: TAB_INSTANCE_ID,
    });

    document.dispatchEvent(dropEvent);

    expect(mockParseBetUrl).not.toHaveBeenCalled();
    expect(mockAddNewSet).not.toHaveBeenCalled();
  });

  it('enters edit mode when a bet set is dropped while in view mode', () => {
    mockUseViewMode.mockReturnValue(true);

    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123',
    });

    document.dispatchEvent(dropEvent);

    expect(mockAddNewSet).toHaveBeenCalled();
    expect(mockSetViewMode).toHaveBeenCalledWith(false);
  });

  it('does not touch view mode when already in edit mode', () => {
    mockUseViewMode.mockReturnValue(false);

    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123',
    });

    document.dispatchEvent(dropEvent);

    expect(mockAddNewSet).toHaveBeenCalled();
    expect(mockSetViewMode).not.toHaveBeenCalled();
  });

  it('does not enter edit mode when nothing was actually dropped', () => {
    mockUseViewMode.mockReturnValue(true);
    mockAnyBetsExist.mockReturnValue(false);

    render(
      <DropZone>
        <div>Test</div>
      </DropZone>,
    );

    const dropEvent = createMockDragEvent('drop', {
      'text/uri-list': 'https://example.com/#round=1234&b=123',
    });

    document.dispatchEvent(dropEvent);

    expect(mockAddNewSet).not.toHaveBeenCalled();
    expect(mockSetViewMode).not.toHaveBeenCalled();
  });
});
