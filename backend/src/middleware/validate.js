export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados invalidos.',
        fields: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      });
    }
    req.body = result.data;
    next();
  };
}
