import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function AnimatedButton({
  children,
  to,
  onClick,
  variant = "primary",
  icon: Icon,
  type = "button",
  disabled = false
}) {
  const className = `premium-button premium-button--${variant}`;
  const content = (
    <>
      {Icon && <Icon size={17} />}
      <span>{children}</span>
    </>
  );

  if (to) {
    return (
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <Link className={className} to={to}>{content}</Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      className={className}
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {content}
    </motion.button>
  );
}
