package ai.whylabs.core.parser;

import ai.whylabs.antlr.WhyFormulaLexer;
import ai.whylabs.antlr.WhyFormulaParser;
import java.util.Map;
import lombok.NonNull;
import lombok.val;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;

public class FormulaEvaluator {
  private final WhyFormulaParser parser;
  private final String ctxID;

  public FormulaEvaluator(@NonNull String formula, String ctxID) {
    val lexer = new WhyFormulaLexer(CharStreams.fromString(formula));
    this.parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    this.ctxID = ctxID;
  }

  public Double evaluate(Map<String, Double> variables) {
    val visitor = new FormulaVisitor(ctxID);
    variables.forEach(visitor::setVariable);
    parser.reset();
    return visitor.visit(parser.expression());
  }
}
