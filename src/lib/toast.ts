import { toast } from "sonner";

/**
 * Centrally managed toast notifications for Snail Studio.
 * Follows design aesthetics: HSL colored toast configurations, auto-dismiss,
 * manual dismiss overrides, and clean descriptions.
 */
export const notify = {
  /**
   * Successful creation, updates, deletions, and logins.
   * Auto-dismisses in 3-5 seconds (default: 4000ms).
   */
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Business rules alerts, validation warnings, inventory alerts.
   * Auto-dismisses in 5-6 seconds (default: 5500ms).
   */
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 5500,
    });
  },

  /**
   * Network errors, server failures, validation exceptions.
   * Longer duration (8000ms) with manual dismiss button action.
   */
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 8000,
      action: {
        label: "Dismiss",
        onClick: () => {},
      },
    });
  },

  /**
   * General notifications and background processing information.
   * Auto-dismisses in 4 seconds.
   */
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  },
};
