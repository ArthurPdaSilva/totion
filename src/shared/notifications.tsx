import { Toaster, toast } from "sonner";

type NotificationType = "success" | "error" | "info";

const NOTIFICATION_TITLES = {
  success: "Sucesso",
  error: "Erro",
  info: "Aviso",
} satisfies Record<NotificationType, string>;

function show(type: NotificationType, message: string) {
  toast[type](NOTIFICATION_TITLES[type], {
    description: message,
  });
}

export const notification = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
  dismissAll: () => toast.dismiss(),
};

export function Notifications() {
  return (
    <Toaster
      position="top-right"
      duration={3500}
      visibleToasts={3}
      closeButton
      offset={20}
      mobileOffset={12}
      containerAriaLabel="Notificações"
      icons={{
        success: <NotificationIcon type="success" />,
        error: <NotificationIcon type="error" />,
        info: <NotificationIcon type="info" />,
        close: <CloseIcon />,
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: "Fechar notificação",
        classNames: {
          toast:
            "relative flex w-full items-start gap-3 rounded-card border border-line bg-panel p-4 pr-10 text-ink shadow-dialog",
          content: "grid flex-1 gap-1",
          title: "text-sm font-bold text-ink",
          description: "text-sm leading-5 text-muted",
          icon: "mt-0.5 flex shrink-0",
          closeButton:
            "absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-canvas hover:text-ink",
          success: "border-l-4 border-l-success",
          error: "border-l-4 border-l-danger",
          info: "border-l-4 border-l-info",
        },
      }}
    />
  );
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const iconStyles = {
    success: "bg-success-soft text-success",
    error: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  } satisfies Record<NotificationType, string>;

  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-full ${iconStyles[type]}`}
      aria-hidden="true"
    >
      <svg
        aria-hidden="true"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
      >
        {type === "success" ? (
          <path
            d="m6.5 12.5 3.5 3.5 7.5-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {type === "error" ? (
          <path
            d="M12 7.5v5.5M12 16.5v.1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : null}
        {type === "info" ? (
          <path
            d="M12 10.5v6M12 7.5v.1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </span>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
