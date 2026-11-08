/**
 * Meridian buttons, built on Kumo UI (Cloudflare's component library).
 *
 * Same API as the old Cloudflare-style button, so the call sites in
 * App.jsx do not change: variant, size, active (toggle), icon,
 * children. Kumo supplies the button behaviour; Meridian's theme
 * tokens in index.css keep the Cloudflare colours, and Kumo's Button
 * shows its own tooltip from the title prop.
 *
 * Per the Kumo Button docs: icon-only buttons use shape="square" (or
 * "circle") with the icon prop and ALWAYS an aria-label, since there
 * is no visible text for screen readers. The loading prop
 * shows a spinner and disables interaction while an async action is
 * in flight. Sidebar navigation links are Kumo SidebarMenuButton
 * with href (the sidebar's link-capable nav item), not LinkButton.
 *
 * @param {'primary' | 'secondary' | 'ghost' | 'toggle'} variant
 * @param {'xs' | 'sm' | 'md'} size
 * @param {boolean} active - toggle state (e.g. Live refresh)
 * @param {React.ReactNode} icon - left-aligned icon element
 * @param {React.ReactNode} children - button label/content
 * @param {'base' | 'square' | 'circle'} shape - icon-only buttons use square
 * @param {string} aria-label - required for icon-only buttons
 * @param {boolean} loading - async action in flight
 */
import { Button as KumoButton } from "@cloudflare/kumo/components/button";
import { ButtonGroup as KumoButtonGroup } from "@cloudflare/kumo/components/button-group";

export function Button({
  variant = 'secondary',
  size = 'md',
  active = false,
  icon,
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  title,
  shape,
  loading = false,
  ...props
}) {
  /* Meridian variants map to Kumo variants; the toggle is Kumo's
     outline (transparent, thin grey ring), with the active ON state
     supplied by .live-refresh-on in index.css. */
  const kumoVariant =
    variant === 'primary' ? 'primary'
    : variant === 'ghost' ? 'ghost'
    : variant === 'toggle' ? 'outline'
    : 'secondary';
  /* Kumo sizes are xs / sm / base / lg; Meridian's md is Kumo's base. */
  const kumoSize = size === 'xs' ? 'xs' : size === 'md' ? 'base' : 'sm';
  /* Toggle active = Live refresh ON: blue border/glow/tint (see
     .live-refresh-on in index.css). No status dot. */
  const activeClass = variant === 'toggle' && active ? 'live-refresh-on' : '';
  return (
    <KumoButton
      variant={kumoVariant}
      size={kumoSize}
      icon={icon}
      disabled={disabled}
      onClick={onClick}
      type={type}
      title={title}
      shape={shape}
      loading={loading}
      className={`${activeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </KumoButton>
  );
}

/**
 * Icon-only button (e.g. hamburger menu, sidebar toggle).
 * Kumo ghost button, square shape: borderless until hover.
 */
export function IconButton({
  icon,
  title,
  onClick,
  className = '',
  size = 'md',
  ...props
}) {
  const kumoSize = size === 'xs' ? 'xs' : size === 'md' ? 'base' : 'sm';
  return (
    <KumoButton
      variant="ghost"
      shape="square"
      size={kumoSize}
      icon={icon}
      title={title}
      aria-label={title}
      onClick={onClick}
      className={className}
      {...props}
    />
  );
}

/**
 * Button group container for connected buttons.
 */
export function ButtonGroup({ children, className = '' }) {
  return (
    <KumoButtonGroup className={className}>
      {children}
    </KumoButtonGroup>
  );
}

export default Button;
