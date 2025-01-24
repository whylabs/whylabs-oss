package ai.whylabs.core.parser;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.nullValue;
import static org.hamcrest.MatcherAssert.assertThat;

import ai.whylabs.antlr.WhyFormulaLexer;
import ai.whylabs.antlr.WhyFormulaParser;
import lombok.val;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.testng.annotations.Test;

public class FormulaVisitorTest {
  @Test
  public void testBasicSum() {
    val lexer = new WhyFormulaLexer(CharStreams.fromString("query1 + query2"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    visitor.setVariable("query1", 1.0);
    visitor.setVariable("query2", 2.0);
    assertThat(visitor.visit(parser.expression()), is(1.0 + 2.0));
  }

  @Test
  public void testSumAndMinus() {
    val lexer = new WhyFormulaLexer(CharStreams.fromString("query1 + query2 - query3"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    visitor.setVariable("query1", 1.0);
    visitor.setVariable("query2", 2.0);
    visitor.setVariable("query3", 0.5);
    assertThat(visitor.visit(parser.expression()), is(1.0 + 2.0 - 0.5));
  }

  @Test
  public void bracketsWithMult() {
    val lexer = new WhyFormulaLexer(CharStreams.fromString("(query1 + query2) * query3"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    visitor.setVariable("query1", 1.0);
    visitor.setVariable("query2", 2.0);
    visitor.setVariable("query3", 0.5);
    assertThat(visitor.visit(parser.expression()), is((1.0 + 2.0) * 0.5));
  }

  @Test
  public void bracketsWithMultAndDiv() {
    val lexer = new WhyFormulaLexer(CharStreams.fromString("(query1 + query2) * query3 / query2"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    visitor.setVariable("query1", 1.0);
    visitor.setVariable("query2", 2.0);
    visitor.setVariable("query3", 0.5);
    assertThat(visitor.visit(parser.expression()), is((1.0 + 2.0) * 0.5 / 2.0));
  }

  @Test
  public void bracketsWithMultAndDivNested() {
    val lexer =
        new WhyFormulaLexer(CharStreams.fromString("(query1 + query2) * (query3 / query2)"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    visitor.setVariable("query1", 1.0);
    visitor.setVariable("query2", 2.0);
    visitor.setVariable("query3", 0.5);
    assertThat(visitor.visit(parser.expression()), is((1.0 + 2.0) * (0.5 / 2.0)));
  }

  @Test
  public void bracketsWithMultAndDivDeepNested() {
    val lexer =
        new WhyFormulaLexer(
            CharStreams.fromString("(query1 + (query1 + query1)) * (query3 / query2)"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    visitor.setVariable("query1", 1.0);
    visitor.setVariable("query2", 2.0);
    visitor.setVariable("query3", 0.5);
    assertThat(visitor.visit(parser.expression()), is((1.0 + (1.0 + 1.0)) * (0.5 / 2.0)));
  }

  @Test
  public void powerOperator() {
    val lexer = new WhyFormulaLexer(CharStreams.fromString("(query1 ^ query2)/query3"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    visitor.setVariable("query1", 2.0);
    visitor.setVariable("query2", 3.0);
    visitor.setVariable("query3", 0.5);
    assertThat(visitor.visit(parser.expression()), is(Math.pow(2.0, 3.0) / 0.5));
  }

  @Test
  public void withConstants() {
    val lexer = new WhyFormulaLexer(CharStreams.fromString("(query1 ^ query2)/3"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    visitor.setVariable("query1", 2.0);
    visitor.setVariable("query2", 3.0);
    visitor.setVariable("query3", 0.5);
    assertThat(visitor.visit(parser.expression()), is(Math.pow(2.0, 3.0) / 3));
  }

  @Test
  public void unboundVariables() {
    val lexer = new WhyFormulaLexer(CharStreams.fromString("(query1 ^ query2)/3"));
    val parser = new WhyFormulaParser(new CommonTokenStream(lexer));
    val visitor = new FormulaVisitor();
    // query2 isn't specified
    visitor.setVariable("query1", 2.0);
    visitor.setVariable("query3", 0.5);
    assertThat(visitor.visit(parser.expression()), is(nullValue()));
  }
}
