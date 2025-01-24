package ai.whylabs.core.parser;

import static java.util.Objects.isNull;

import ai.whylabs.antlr.WhyFormulaBaseVisitor;
import ai.whylabs.antlr.WhyFormulaParser;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiFunction;
import lombok.val;
import org.antlr.v4.runtime.ParserRuleContext;
import org.jetbrains.annotations.Nullable;

public class FormulaVisitor extends WhyFormulaBaseVisitor<Double> {
  private final Map<String, Optional<Double>> variables = new HashMap<>();
  private final String ctxId;

  public FormulaVisitor() {
    this(null);
  }

  public FormulaVisitor(String ctxId) {
    this.ctxId = ctxId;
  }

  public void setVariable(String variable, Double value) {
    variables.put(variable, Optional.ofNullable(value));
  }

  @Override
  public Double visitPlus(WhyFormulaParser.PlusContext ctx) {
    return applyOps(ctx.plusOrMinus(), Double::sum);
  }

  @Override
  public Double visitMinus(WhyFormulaParser.MinusContext ctx) {
    return applyOps(ctx.plusOrMinus(), (a, b) -> a - b);
  }

  @Override
  public Double visitDiv(WhyFormulaParser.DivContext ctx) {
    return applyOps(ctx.divOrMult(), (a, b) -> a / b);
  }

  @Override
  public Double visitMult(WhyFormulaParser.MultContext ctx) {
    return applyOps(ctx.divOrMult(), (a, b) -> a * b);
  }

  @Override
  public Double visitPower(WhyFormulaParser.PowerContext ctx) {
    return applyOps(ctx.factor(), Math::pow);
  }

  @Nullable
  private Double applyOps(
      List<? extends ParserRuleContext> factors, BiFunction<Double, Double, Double> op) {
    Double res = null;
    for (ParserRuleContext factorContext : factors) {
      val value = visit(factorContext);
      if (value == null) {
        return null;
      }

      if (res == null) {
        res = value;
      } else {
        res = op.apply(res, value);
      }
    }
    return res;
  }

  @Override
  public Double visitAbsExpression(WhyFormulaParser.AbsExpressionContext ctx) {
    Double value = visit(ctx.factor());
    if (value == null) {
      return null;
    }
    return Math.abs(value);
  }

  @Override
  public Double visitLog2Expression(WhyFormulaParser.Log2ExpressionContext ctx) {
    Double value = visit(ctx.factor());
    if (value == null) {
      return null;
    }
    return Math.log(value);
  }

  @Override
  public Double visitLog10Expression(WhyFormulaParser.Log10ExpressionContext ctx) {
    Double value = visit(ctx.factor());
    if (value == null) {
      return null;
    }
    return Math.log10(value);
  }

  @Override
  public Double visitMaxExpression(WhyFormulaParser.MaxExpressionContext ctx) {
    Double left = visit(ctx.factor(0));
    Double right = visit(ctx.factor(1));
    if (isNull(left)) return right;
    if (isNull(right)) return left;
    return Math.max(left, right);
  }

  @Override
  public Double visitMinExpression(WhyFormulaParser.MinExpressionContext ctx) {
    Double left = visit(ctx.factor(0));
    Double right = visit(ctx.factor(1));
    if (isNull(left)) return right;
    if (isNull(right)) return left;
    return Math.min(left, right);
  }

  @Override
  public Double visitFactor(WhyFormulaParser.FactorContext ctx) {
    if (ctx.ID() != null) {
      String name;
      if (ctxId != null) name = ctxId + "_" + ctx.ID().getText();
      else name = ctx.ID().getText();
      return variables.getOrDefault(name, Optional.empty()).orElse(null);
    } else if (ctx.NUMBER() != null) {
      return Double.valueOf(ctx.NUMBER().getText());
    } else if (ctx.expression() != null) {
      return visit(ctx.expression());
    }
    return super.visitFactor(ctx);
  }
}
