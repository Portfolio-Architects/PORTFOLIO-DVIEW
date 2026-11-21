/**
 * @jest-environment jsdom
 * @file photo_upload_modal_security.test.tsx
 * @description Runtime behavioral tests for PhotoUploadModal [HIGH-03] UID Storage path sanitization.
 */

import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PhotoUploadModal } from '@/components/apartment-modal/PhotoUploadModal';

const mockUploadImage = jest.fn();
const mockAddDoc = jest.fn();

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    const { fill: _fill, ...imgProps } = props;
    return <img {...imgProps} alt={imgProps.alt || ''} />;
  },
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'pending_photos_col'),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}));

jest.mock('@/lib/utils/firestoreThrottle', () => ({
  throttle: <T,>(fn: () => Promise<T>) => fn(),
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/services/storage.service', () => ({
  ALLOWED_RASTER_IMAGE_MIME_TYPES: new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/heic',
    'image/heif',
  ]),
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
}));

describe('PhotoUploadModal [HIGH-03] UID Storage Path Sanitization', () => {
  const origCreateObjectURL = URL.createObjectURL;
  const origRevokeObjectURL = URL.revokeObjectURL;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:mock-preview-url');
    URL.revokeObjectURL = jest.fn();
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    mockUploadImage.mockResolvedValue(
      'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls.firebasestorage.app/o/user_pending_photos%2Fsafe%2F1.jpg?alt=media'
    );
    mockAddDoc.mockResolvedValue({ id: 'pending-1' });
  });

  afterEach(() => {
    cleanup();
    alertSpy.mockRestore();
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
  });

  it('sanitizes forward and backward slashes in user.uid before calling uploadImage', async () => {
    const { container, getByText } = render(
      <PhotoUploadModal
        isOpen
        onClose={jest.fn()}
        apartmentId="apt-1"
        apartmentName="동탄역롯데캐슬"
        user={{ uid: ' ../admin\\escape/uid ', email: 'tester@dongtanview.com' }}
      />
    );

    const fileInput = container.ownerDocument.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const validFile = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    fireEvent.click(getByText('사진 등록하기'));

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledTimes(1);
    });
    expect(mockUploadImage).toHaveBeenCalledWith(validFile, 'user_pending_photos/.._admin_escape_uid');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it('blocks upload when user.uid is missing, whitespace-only, dot, double-dot, or contains control characters', async () => {
    for (const badUser of [
      undefined,
      { uid: '' },
      { uid: '   ' },
      { uid: '.' },
      { uid: '..' },
      { uid: 'uid\u0000evil' },
      { uid: 'uid\nevil' },
    ]) {
      jest.clearAllMocks();
      const { container, getByText, unmount } = render(
        <PhotoUploadModal
          isOpen
          onClose={jest.fn()}
          apartmentId="apt-1"
          apartmentName="동탄역롯데캐슬"
          user={badUser}
        />
      );

      const fileInput = container.ownerDocument.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      fireEvent.click(getByText('사진 등록하기'));

      expect(alertSpy).toHaveBeenCalled();
      expect(mockUploadImage).not.toHaveBeenCalled();
      expect(mockAddDoc).not.toHaveBeenCalled();
      unmount();
    }
  });
});
