/** Titled group of form fields. Styles: .form-section in styles/layout.css */
export default function FormSection({ title, description, children, className = '' }) {
  return (
    <section className={`form-section ${className}`.trim()}>
      <h3 className="form-section__title">{title}</h3>
      <p className="form-section__desc">{description}</p>
      {children}
    </section>
  );
}
