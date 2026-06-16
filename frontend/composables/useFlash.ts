export const useFlash = () => {
  const notice = useState<string>('flash-notice', () => '');
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const flash = (message: string) => {
    if (timeout) clearTimeout(timeout);
    notice.value = message;
    timeout = setTimeout(() => {
      notice.value = '';
      timeout = null;
    }, 2400);
  };

  return {
    notice,
    flash,
  };
};
